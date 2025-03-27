#!jinja | metalk8s_kubernetes

{% raw %}

apiVersion: v1
kind: ConfigMap
metadata:
  name: thanos-query-sd-files
  namespace: metalk8s-monitoring
  labels:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos

{% endraw %}
