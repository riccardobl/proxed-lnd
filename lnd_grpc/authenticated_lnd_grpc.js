const { join } = require('path');

const { loadSync } = require('@grpc/proto-loader');

const apiForProto = require('lightning/lnd_grpc/api_for_proto');
const { defaultSocket } = require('lightning/grpc');
const grpcCredentials = require('lightning/lnd_grpc/grpc_credentials');
const grpcOptions = require('lightning/lnd_grpc/grpc_options');
const { grpcSslCipherSuites } = require('lightning/grpc');
const { maxReceiveMessageLength } = require('lightning/grpc');
const { packageTypes } = require('lightning/grpc');
const { protoFiles } = require('lightning/grpc');
const { protosDir } = require('lightning/grpc');
const { serviceTypes } = require('lightning/grpc');

const { GRPC_SSL_CIPHER_SUITES } = process.env;
const { keys } = Object;
const pathForProto = proto => join(__dirname, protosDir, proto);

/** Initiate a gRPC API Methods Object for authenticated methods

  Both the cert and macaroon expect the entire serialized LND generated file

  {
    [cert]: <Base64 or Hex Serialized LND TLS Cert>
    [macaroon]: <Base64 or Hex Serialized Macaroon String>
    [path]: <Path to Proto Files Directory String>
    [socket]: <Host:Port Network Address String>
  }

  @throws
  <Error>

  @returns
  {
    lnd: {
      autopilot: <Autopilot API Methods Object>
      chain: <ChainNotifier API Methods Object>
      default: <Default API Methods Object>
      invoices: <Invoices API Methods Object>
      peers: <Peers API Methods Object>
      router: <Router API Methods Object>
      signer: <Signer Methods API Object>
      tower_client: <Watchtower Client Methods Object>
      tower_server: <Watchtower Server Methods API Object>
      wallet: <WalletKit gRPC Methods API Object>
      version: <Version Methods API Object>
    }
  }
*/
module.exports = ({ cert, macaroon, path, socket }, withProxy) => {
    const { credentials } = grpcCredentials({ cert, macaroon });
    const lndSocket = socket || defaultSocket;

    if (!!cert && GRPC_SSL_CIPHER_SUITES !== grpcSslCipherSuites) {
        process.env.GRPC_SSL_CIPHER_SUITES = grpcSslCipherSuites;
    }

    const params = {
        'grpc.max_receive_message_length': -1,
        'grpc.max_send_message_length': -1,
        'grpc.enable_http_proxy': withProxy ? 1 : 0
    };

    console.log('use grpc proxy:', !!withProxy);

    // Assemble different services from their proto files
    return {
        lnd: keys(serviceTypes).reduce((services, type) => {
            const service = serviceTypes[type];

            const file = protoFiles[service];

            services[type] = apiForProto({
                credentials,
                params,
                service,
                path: !!path ? join(path, file) : pathForProto(file),
                socket: lndSocket,
                type: packageTypes[service],
            });

            return services;
        },
            {}),
    };
};
