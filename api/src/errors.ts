export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const isHttpError = (value: unknown): value is HttpError => {
  return value instanceof HttpError;
};
