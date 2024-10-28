include:
  - .namespace
  - metalk8s.addons.logging.loki.deployed
  - metalk8s.addons.logging.fluent-bit.deployed
  - metalk8s.addons.prometheus-operator.deployed.namespace

{#- In MetalK8s 128.0 we changed the fluent-bit dashboard to use
    the one from the helm chart. We need to remove the old one
    to avoid conflicts.
    This can be removed in `development/129.0` #}
Ensure old fluent-bit dashboard does no longer exists:
  metalk8s_kubernetes.object_absent:
    - name: fluent-bit-dashboard
    - namespace: metalk8s-monitoring
    - apiVersion: v1
    - kind: ConfigMap
