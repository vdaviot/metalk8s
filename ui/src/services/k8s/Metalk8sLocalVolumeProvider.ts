import { V1PersistentVolume } from '@kubernetes/client-node';
import * as ApiK8s from './api';
import {
  Metalk8sV1alpha1VolumeClient,
  Result,
} from './Metalk8sVolumeClient.generated';

function isError<T>(result: Result<T>): result is { error: any } {
  return (result as { error: any }).error !== undefined;
}

export enum VolumeType {
  Hardware = 'Hardware',
  Virtual = 'Virtual',
}

export type LocalPersistentVolume = V1PersistentVolume & {
  IP: string;
  devicePath: string;
  nodeName: string;
  volumeType: VolumeType;
};

export default class Metalk8sLocalVolumeProvider {
  apiUrl: string;
  constructor(apiUrl: string, private getToken: () => Promise<string>) {
    this.apiUrl = apiUrl;
  }

  public listLocalPersistentVolumes = async (
    serverName: string,
  ): Promise<LocalPersistentVolume[]> => {
    try {
      const token = await this.getToken();
      const { coreV1, customObjects } = ApiK8s.updateApiServerConfig(
        this.apiUrl,
        token,
      );
      const volumeClient = new Metalk8sV1alpha1VolumeClient(customObjects);
      const k8sClient = coreV1;

      const nodes = await k8sClient.listNode();
      const nodeIP = nodes.body.items
        .find((node) => node.metadata.name === serverName)
        ?.status.addresses.find((address) => address.type === 'InternalIP');

      if (!nodeIP) {
        throw new Error(`Failed to find IP for node ${serverName}`);
      }

      const volumes = await volumeClient.getMetalk8sV1alpha1VolumeList();

      if (!isError(volumes)) {
        const nodeVolumes = volumes.body.items.filter(
          (volume) => volume.spec.nodeName === serverName,
        );
        const pv = await k8sClient.listPersistentVolume();

        const localPv = nodeVolumes.reduce((acc, item) => {
          const isLocalPv = pv.body.items.find(
            (p) => p.metadata.name === item.metadata['name'],
          );

          return [
            ...acc,
            {
              ...isLocalPv,
              IP: nodeIP.address,
              devicePath:
                item.spec?.rawBlockDevice?.devicePath || item.metadata['name'],
              nodeName: item.spec.nodeName,
              volumeType: item.spec.rawBlockDevice
                ? VolumeType.Hardware
                : VolumeType.Virtual,
            },
          ];
        }, [] as LocalPersistentVolume[]);

        return localPv;
      } else {
        throw new Error(`Failed to fetch metalk8s volumes: ${volumes.error}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch local persistent volumes: ${error.message}`,
      );
    }
  };

  // Since we don't have unique Serial Number for the disks, we need to retrieve the Volume Name from the PV.
  public detachVolumes = async (
    localPVs: LocalPersistentVolume[],
  ): Promise<void> => {
    // The volume name is the same as the PV name
    const volumeNames = localPVs.map((localPV) => localPV.metadata.name);
    const token = await this.getToken();
    const { customObjects } = ApiK8s.updateApiServerConfig(this.apiUrl, token);
    const volumeClient = new Metalk8sV1alpha1VolumeClient(customObjects);

    for (const volumeName of volumeNames) {
      try {
        await volumeClient.deleteMetalk8sV1alpha1Volume(volumeName);
      } catch (error) {
        throw new Error(
          `Failed to delete MetalK8s volume ${volumeName}: ${
            error instanceof Error ? error.message : JSON.stringify(error)
          }`,
        );
      }
    }
  };
}
