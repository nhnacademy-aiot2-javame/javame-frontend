FROM ubuntu:latest
LABEL authors="jangwonseong"

ENTRYPOINT ["top", "-b"]

FROM openjdk:21-jdk-slim

WORKDIR /app

COPY target/*.jar hello.jar

EXPOSE 10271

CMD ["java", "-jar", "hello.jar"]