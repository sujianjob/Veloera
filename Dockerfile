FROM oven/bun:latest AS builder

WORKDIR /build
COPY web/package.json web/package.json
COPY web/bun.lockb web/bun.lockb
WORKDIR /build/web
RUN bun install
WORKDIR /build
COPY ./web ./web
COPY ./VERSION .
WORKDIR /build/web
RUN DISABLE_ESLINT_PLUGIN='true' VITE_REACT_APP_VERSION=$(cat ../VERSION) bun run build

FROM golang:alpine AS builder2

ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOOS=linux

WORKDIR /build

ADD go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=builder /build/web/dist ./web/dist
RUN go build -ldflags "-s -w -X 'veloera/common.Version=$(cat VERSION)'" -o veloera

FROM alpine

RUN apk update \
    && apk upgrade \
    && apk add --no-cache ca-certificates tzdata ffmpeg \
    && update-ca-certificates

COPY --from=builder2 /build/veloera /
EXPOSE 3000
WORKDIR /data
ENTRYPOINT ["/veloera"]
