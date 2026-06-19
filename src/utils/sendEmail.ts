import nodemailer from "nodemailer";

interface SendEmailOptions {
    to: string;
    subject: string;
    text?: string;
    html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<any> => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "2525"),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mailOptions = {
        from: process.env.SMTP_FROM || '"Scale Auth" <no-reply@scaleauth.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };

    return await transporter.sendMail(mailOptions);
};
