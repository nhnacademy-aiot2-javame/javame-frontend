FROM openjdk:21-jdk-slim

LABEL authors="jangwonseong"

WORKDIR /app

COPY target/*.jar hello.jar

EXPOSE 10271

CMD ["java", "-jar", "hello.jar"]