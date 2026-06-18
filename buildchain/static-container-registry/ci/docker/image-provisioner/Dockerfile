FROM docker.io/ubuntu:resolute

RUN apt-get update \
      && \
      apt-get install -y software-properties-common\
      && \
      add-apt-repository ppa:projectatomic/ppa \
      && \
      apt-get update \
      && \
      apt-get install -y skopeo

RUN apt-get install \
      hardlink

COPY provision-images.sh /provision-images.sh
