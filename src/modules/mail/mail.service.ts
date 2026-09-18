import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { env } from '../../env';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

  async sendPasswordRecoveryEmail(to: string, resetUrl: string): Promise<void> {
    if (!this.client) {
      this.logger.warn(
        `RESEND_API_KEY não configurado — email de recuperação não enviado para ${to}`,
      );
      return;
    }

    const { error } = await this.client.emails.send({
      from: env.MAIL_FROM,
      to,
      subject: 'Recupere sua senha - RFinance',
      html: `
        <p>Você pediu para redefinir sua senha no RFinance.</p>
        <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a></p>
        <p>Esse link expira em 30 minutos. Se não foi você, ignore este email.</p>
      `,
    });

    if (error) {
      this.logger.error(`Falha ao enviar email de recuperação para ${to}: ${error.message}`);
    }
  }
}
