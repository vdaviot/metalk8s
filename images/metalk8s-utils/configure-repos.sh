#!/bin/bash

set -xue -o pipefail

K8S_SHORT_VERSION=$1
SALT_VERSION=$2

cat > /etc/yum.repos.d/kubernetes.repo << EOF
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v$K8S_SHORT_VERSION/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v$K8S_SHORT_VERSION/rpm/repodata/repomd.xml.key
EOF

cat > /etc/yum.repos.d/saltstack.repo << EOF
[saltstack]
name=Scality SaltStack repo for RHEL/CentOS \$releasever
baseurl=https://downloads.scality.com/repository/redhat/\$releasever/saltstack/$SALT_VERSION
enabled=1
gpgcheck=0
EOF
