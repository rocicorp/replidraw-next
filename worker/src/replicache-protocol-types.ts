// ts-to-zod can't handle circluar types :-/.
type JSONValue = any;

export type PushRequest = {
  clientID: string;
  mutations: Mutation[];
  pushVersion: number;
  schemaVersion: string;
};

export type Mutation = {
  id: number;
  name: string;
  args?: JSONValue;
};

export type PullRequest = {
  clientID: string;
  cookie?: JSONValue;
  pullVersion: number;
  schemaVersion: string;
};

export type PullResponse = {
  cookie?: JSONValue;
  lastMutationID: number;
  patch: PatchOperation[];
};

export type PatchOperation =
  | {
      op: 'put';
      key: string;
      value?: JSONValue;
    }
  | {op: 'del'; key: string}
  | {op: 'clear'};
