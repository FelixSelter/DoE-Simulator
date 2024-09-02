// eslint-disable-next-line @typescript-eslint/no-unused-vars
class NotImplementedError extends Error {
  constructor(message = "", ...args: never[]) {
    super(message, ...args);
    this.message = message + " has not yet been implemented.";
  }
}
