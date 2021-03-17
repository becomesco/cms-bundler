import { ObjectSchema } from './object-schema';

export interface Config {
  port: number;
  security: {
    jwt: {
      issuer: string;
      secret: string;
      expireIn: number;
    };
  };
  database: {
    fs?: string;
    mongodb?: {
      selfHosted?: {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
        prefix: string;
      };
      atlas?: {
        name: string;
        user: string;
        password: string;
        prefix: string;
        cluster: string;
      };
    };
  };
  plugins: string[];
}

export const ConfigSchema: ObjectSchema = {
  security: {
    __type: 'object',
    __required: true,
    __child: {
      jwt: {
        __type: 'object',
        __required: true,
        __child: {
          issuer: {
            __type: 'string',
            __required: true,
          },
          secret: {
            __type: 'string',
            __required: true,
          },
        },
      },
    },
  },
  database: {
    __type: 'object',
    __required: true,
    __child: {
      fs: {
        __type: 'string',
        __required: false,
      },
      mongodb: {
        __type: 'object',
        __required: false,
        __child: {
          selfHosted: {
            __type: 'object',
            __required: false,
            __child: {
              host: {
                __type: 'string',
                __required: true,
              },
              port: {
                __type: 'number',
                __required: true,
              },
              name: {
                __type: 'string',
                __required: true,
              },
              user: {
                __type: 'string',
                __required: true,
              },
              password: {
                __type: 'string',
                __required: true,
              },
              prefix: {
                __type: 'string',
                __required: true,
              },
            },
          },
          atlas: {
            __type: 'object',
            __required: false,
            __child: {
              name: {
                __type: 'string',
                __required: true,
              },
              user: {
                __type: 'string',
                __required: true,
              },
              password: {
                __type: 'string',
                __required: true,
              },
              prefix: {
                __type: 'string',
                __required: true,
              },
              cluster: {
                __type: 'string',
                __required: true,
              },
            },
          },
        },
      },
    },
  },
  plugins: {
    __type: 'array',
    __required: true,
    __child: {
      __type: 'string',
    },
  },
};
