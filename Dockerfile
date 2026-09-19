FROM gradle:9.7.1-jdk21 AS build
WORKDIR /workspace
COPY . .
RUN gradle installDist --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/install/pulseboard-api/ /app/
EXPOSE 8080
CMD ["/app/bin/pulseboard-api"]
