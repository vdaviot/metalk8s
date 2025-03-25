import { CoreV1Api, CustomObjectsApi } from '@kubernetes/client-node';
import Metalk8sLocalVolumeProvider, {
  VolumeType,
} from './Metalk8sLocalVolumeProvider';
import { updateApiServerConfig } from './api';
import { Metalk8sV1alpha1VolumeClient } from './Metalk8sVolumeClient.generated';

jest.mock('../k8s/api', () => ({
  updateApiServerConfig: jest.fn(),
}));

describe('Metalk8sLocalVolumeProvider', () => {
  let provider: Metalk8sLocalVolumeProvider;
  const mockUrl = 'mock-url';
  const mockToken = 'mock-token';

  const mockCustomObjectsApi = {
    listClusterCustomObject: jest.fn(),
  } as unknown as CustomObjectsApi;

  const mockVolumeClient = {
    deleteMetalk8sV1alpha1Volume: jest.fn().mockResolvedValue({ body: {} }),
    getMetalk8sV1alpha1VolumeList: jest.fn(),
    getMetalk8sV1alpha1Volume: jest.fn(),
    createMetalk8sV1alpha1Volume: jest.fn(),
    patchMetalk8sV1alpha1Volume: jest.fn(),
  } as unknown as Metalk8sV1alpha1VolumeClient;

  const mockCoreV1Api = {
    listNode: jest.fn(),
    listPersistentVolume: jest.fn(),
    deletePersistentVolume: jest.fn(),
  } as unknown as CoreV1Api;

  beforeEach(() => {
    (updateApiServerConfig as jest.Mock).mockReturnValue({
      coreV1: mockCoreV1Api,
      customObjects: mockCustomObjectsApi,
    });

    provider = new Metalk8sLocalVolumeProvider(mockUrl, mockToken);
    provider.k8sClient = mockCoreV1Api;
    provider.volumeClient = mockVolumeClient;
  });

  describe('listLocalPersistentVolumes', () => {
    it('should return local persistent volumes for a given node.', async () => {
      (mockCoreV1Api.listNode as jest.Mock).mockResolvedValue({
        body: {
          items: [
            {
              metadata: { name: 'test-node' },
              status: {
                addresses: [
                  { type: 'Hostname', address: 'test-node' },
                  { type: 'InternalIP', address: '192.168.1.100' },
                ],
              },
            },
          ],
        },
      });

      (mockCoreV1Api.listPersistentVolume as jest.Mock).mockResolvedValue({
        body: {
          items: [
            {
              metadata: { name: 'test-volume' },
              spec: {},
            },
          ],
        },
      });

      (
        mockVolumeClient.getMetalk8sV1alpha1VolumeList as jest.Mock
      ).mockResolvedValue({
        body: {
          items: [
            {
              metadata: { name: 'test-volume' },
              spec: {
                nodeName: 'test-node',
                rawBlockDevice: { devicePath: '/dev/sda' },
              },
            },
            {
              metadata: { name: 'test-lvm' },
              spec: {
                nodeName: 'test-node',
                lvmLogicalVolume: { vgName: 'test-lvm', size: '10Gi' },
              },
            },
            {
              metadata: { name: 'test-sparseLoop' },
              spec: {
                nodeName: 'test-node',
                sparseLoopDevice: {
                  size: '1Gi',
                },
              },
            },
          ],
        },
      });

      const volumes = await provider.listLocalPersistentVolumes('test-node');

      expect(volumes).toHaveLength(3);
      expect(volumes[0]).toMatchObject({
        IP: '192.168.1.100',
        devicePath: '/dev/sda',
        nodeName: 'test-node',
        volumeType: VolumeType.Hardware,
      });
      expect(volumes[1]).toMatchObject({
        IP: '192.168.1.100',
        devicePath: 'test-lvm',
        nodeName: 'test-node',
        volumeType: VolumeType.Virtual,
      });
      expect(volumes[2]).toMatchObject({
        IP: '192.168.1.100',
        devicePath: 'test-sparseLoop',
        nodeName: 'test-node',
        volumeType: VolumeType.Virtual,
      });
    });

    it('should raise an error if the node cannot be found', async () => {
      (mockCoreV1Api.listNode as jest.Mock).mockResolvedValue({
        body: { items: [] },
      });

      await expect(
        provider.listLocalPersistentVolumes('non-existent-node'),
      ).rejects.toThrow('Failed to find IP for node non-existent-node');
    });

    it('should raise an error if volume retrieval fails', async () => {
      (mockCoreV1Api.listNode as jest.Mock).mockResolvedValue({
        body: {
          items: [
            {
              metadata: { name: 'test-node' },
              status: {
                addresses: [
                  { type: 'Hostname', address: 'test-node' },
                  { type: 'InternalIP', address: '192.168.1.100' },
                ],
              },
            },
          ],
        },
      });

      (
        mockVolumeClient.getMetalk8sV1alpha1VolumeList as jest.Mock
      ).mockRejectedValue(new Error('Failed to fetch volumes'));

      await expect(
        provider.listLocalPersistentVolumes('test-node'),
      ).rejects.toThrow(
        'Failed to fetch local persistent volumes: Failed to fetch volumes',
      );
    });
  });

  describe('detachVolumes', () => {
    it('should detach hardware volumes and virtual volumes', async () => {
      //S
      (
        mockVolumeClient.deleteMetalk8sV1alpha1Volume as jest.Mock
      ).mockResolvedValue({
        body: {},
      });
      //E
      await provider.detachVolumes([
        {
          IP: '192.168.1.100',
          devicePath: '/dev/sda',
          volumeType: VolumeType.Hardware,
          nodeName: 'test-node',
          metadata: { name: 'test-volume' },
        },
        {
          IP: '192.168.1.100',
          devicePath: 'test-lvm',
          volumeType: VolumeType.Virtual,
          nodeName: 'test-node',
          metadata: { name: 'test-lvm' },
        },
      ]);
      //V
      expect(
        mockVolumeClient.deleteMetalk8sV1alpha1Volume,
      ).toHaveBeenCalledWith('test-volume');
      expect(
        mockVolumeClient.deleteMetalk8sV1alpha1Volume,
      ).toHaveBeenCalledWith('test-lvm');
    });

    it('should raise an error if metalk8s volume deletion fails', async () => {
      //S
      (
        mockVolumeClient.deleteMetalk8sV1alpha1Volume as jest.Mock
      ).mockRejectedValue(new Error('Failed to delete metalk8s volume'));
      //E+V
      await expect(
        provider.detachVolumes([
          {
            IP: '192.168.1.100',
            devicePath: '/dev/sda',
            volumeType: VolumeType.Hardware,
            nodeName: 'test-node',
            metadata: { name: 'test-volume' },
          },
        ]),
      ).rejects.toThrow(
        'Failed to delete MetalK8s volume test-volume: Failed to delete metalk8s volume',
      );
    });
  });
});
