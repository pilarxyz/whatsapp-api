import { z } from 'zod';
import { httpStatusCode } from '../constants/httpStatusCode';

function formatServiceReturn(
  status: boolean,
  code: number,
  data = null,
  message = null
) {
  return { status, code, data, message };
}

function isClientErrorCategory(code: number) {
  return code >= 400 && code <= 500;
}

import { Response } from 'express';

function sendResponse(
  res: Response,
  code: number,
  message: string,
  data?: any,
  error?: any
): void {
  const result: { message: string; success: boolean; data?: any; error?: any } =
    {
      message,
      success: true,
    };

  if (data) {
    result.data = data;
  }

  if (isClientErrorCategory(code)) {
    result.success = false;
  }

  if (error) {
    result.success = false;
    result.error = process.env.NODE_ENV === 'local' ? error : null;
    console.error({ ...result, error });
  }

  res.status(code);
  res.json(result);
}

function buildError(
  code: number,
  message: string | Error,
  referenceId: string
): any {
  const result: { code: number; message: string; referenceId: string } = {
    code,
    message: '',
    referenceId,
  };

  if (message instanceof Error) {
    result.message = message.message;
    console.error(message.message);
    console.error(message.stack);
  } else {
    result.message = message as string;
    console.error(message);
  }

  return result;
}

function buildFileResponse(
  res: Response,
  code: number,
  mimeType: string,
  fileName: string | null,
  data: string | Buffer
): void {
  res.status(code);

  if (fileName) {
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  }

  res.setHeader('Content-type', mimeType);

  if (mimeType.includes('csv')) {
    res.end(data as string);
  } else {
    res.end(data as Buffer, 'binary');
  }
}

function notFound({
  res,
  message,
  err,
}: {
  res: Response;
  message: string;
  err: any;
}) {
  sendResponse(res, httpStatusCode.NOT_FOUND, message, null, err);
}

function internalError({
  res,
  message = 'Internal Server Error',
  err,
}: {
  res: Response;
  message?: string;
  err?: any;
}) {
  sendResponse(res, httpStatusCode.INTERNAL_SERVER_ERROR, message, null, err);
}

function csvFile({
  res,
  fileName,
  data,
}: {
  res: Response;
  fileName: string;
  data: string | Buffer;
}) {
  buildFileResponse(res, httpStatusCode.OK, 'text/csv', fileName, data);
}

function prepareListResponse(
  page: number,
  total: number,
  array: any[],
  limit: number
) {
  const result = {
    page,
    count: array.length,
    limit,
    total,
    result: array,
  };
  return result;
}

function prepareListResponseCustom(
  currentPage: number,
  total: number,
  array: any[],
  perPage: number,
  sort: string,
  filter: string
) {
  const result = {
    previousPage: currentPage > 1 ? currentPage - 1 : null,
    nextPage: total / perPage > currentPage ? currentPage + 1 : null,
    currentPage,
    perPage,
    total,
    sort,
    filter,
    data: array,
  };
  return result;
}

function conflict({
  res,
  message,
  err,
}: {
  res: Response;
  message: string;
  err: any;
}) {
  sendResponse(res, httpStatusCode.CONFLICT, message, null, err);
}

function badRequest({
  res,
  message = 'Bad Request',
  err,
}: {
  res: Response;
  message: string;
  err?: z.ZodError<any>;
}) {
  let code = httpStatusCode.BAD_REQUEST;
  let msg = message;

  // if (err && err?.message) {
  //   msg = err.message;
  // }

  //   if (message?.code) {
  //     code = message.code;
  //     msg = message.message;
  //   }

  sendResponse(res, code, msg, null, err);
}

function formatClientErrorResponse(
  res: Response,
  data: { code: httpStatusCode; message: string },
  err: any
) {
  const message = data?.message;

  if (data.code === httpStatusCode.CONFLICT) {
    conflict({ res, message, err });
  } else if (data.code === httpStatusCode.BAD_REQUEST) {
    badRequest({ res, message, err });
  } else if (data.code === httpStatusCode.INTERNAL_SERVER_ERROR) {
    let error = err;

    if (!err) {
      error = new Error(message);
    }

    internalError({ res, message, err: error });
  } else {
    notFound({ res, message, err });
  }
}
function ok({
  res,
  message,
  data,
}: {
  res: Response;
  message: string;
  data: any;
}) {
  sendResponse(res, httpStatusCode.OK, message, data);
}

export {
  formatServiceReturn,
  sendResponse,
  buildError,
  prepareListResponse,
  prepareListResponseCustom,
  conflict,
  badRequest,
  notFound,
  internalError,
  ok,
  csvFile,
  formatClientErrorResponse,
  httpStatusCode,
};
