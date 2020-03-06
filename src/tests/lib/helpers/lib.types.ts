export interface CallbackInPromiseInterface {
  (data: any, resolve: ResolveInPromiseInterface, reject: RejectInPromiseInterface): void;
}

export interface ResolveInPromiseInterface {
  (data: object): void;
}

export interface RejectInPromiseInterface {
  (err: object): void;
}

export class CompareJsonResult {
  diff: object;
  result: boolean;

  constructor(result: boolean, diff: object) {
    this.diff = diff;
    this.result = result;
  }

  getResult() {
    return this.result;
  }

  getDiff() {
    return this.diff;
  }
}