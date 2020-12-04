import { ObjectSchema } from './object-schema';

export interface Plugin {
  name: string;
  frontend?: {
    displayName: string;
    icon?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props?: any;
  };
  backend?: {
    controller?: boolean;
    middleware?: boolean;
  };
}

export const PluginSchema: ObjectSchema = {
  name: {
    __type: 'string',
    __required: true,
  },
  frontend: {
    __type: 'object',
    __required: false,
    __child: {
      displayName: {
        __type: 'string',
        __required: true,
      },
      icon: {
        __type: 'string',
        __required: false,
      },
    },
  },
};
