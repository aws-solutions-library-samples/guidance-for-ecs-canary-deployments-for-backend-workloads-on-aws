FROM public.ecr.aws/docker/library/golang:1.21.6-alpine3.19 as builder

WORKDIR /go/src/consumer
COPY go.mod .
COPY go.sum .

RUN go env -w GOPROXY=direct

RUN apk add -U git
RUN go mod download

COPY *.go ./

RUN CGO_ENABLED=0 go build -a -tags netgo -o /consumer 

# Build final image
FROM public.ecr.aws/docker/library/alpine:3.19

# RUN apk update \
#     && apk add ca-certificates \
#     && rm -rf /var/cache/apk/* \
#     && update-ca-certificates

COPY --from=builder /consumer /

USER nobody

ENTRYPOINT ["/consumer"]