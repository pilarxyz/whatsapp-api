import { Request, Response } from 'express';
import { z } from 'zod';
import * as whatsappService from '../services/whatsappService';
import { categorizeFile } from '../utils/general';
import * as ResponseUtil from '../utils/response';
import { handleSchemaValidation } from '../utils/schema-validation';

export const sendMessage = async (req: Request, res: Response) => {
  const messageSchema = z.object({
    sender: z.string(),
    receiver: z.string(),
    message: z.string(),
    file: z.string().optional(),
  });

  const data = handleSchemaValidation(messageSchema, req.body, res);

  if (!data) {
    return;
  }

  const session = await whatsappService.getSessionAndCheckStatus(
    data.sender,
    res
  );
  if (!session) {
    return;
  }
  try {
    const receivers = data.receiver.split('|');

    let formattedMessage = {
      text: data.message,
    } as any;

    if (data.file) {
      const categoryFile = categorizeFile(data.file);

      formattedMessage = {
        caption: data.message,
        ...categoryFile,
      };
    }

    const results = [];
    console.log(formattedMessage);
    for (const recipient of receivers) {
      const formattedPhoneNumber = whatsappService.formatPhone(recipient);
      try {
        const result = await whatsappService.sendMessage(
          session,
          formattedPhoneNumber,
          formattedMessage,
          1000
        );
        results.push({ recipient, ...result });
      } catch (error) {
        // Handle the error if needed
        console.error(
          `Failed to send message to recipient ${recipient}: ${error}`
        );
      }
    }

    return ResponseUtil.ok({ res, data: results, message: 'Message sent' });
  } catch (error) {
    console.log(error);
    return ResponseUtil.internalError({ res, err: error });
  }
};
