import * as nodemailer from "nodemailer";

type User = {
  email: string;
  subject: string;
  message: string;
};

const sendEmail = async (user: User) => {
  //criando o transporter, serviço de envio de emails
  const port = Number(process.env.EMAIL_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST ?? "",
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER ?? "",
      pass: process.env.EMAIL_PASSWORD ?? "",
    },
  });

  const emailOptions = {
    from: `Paris Sem Gol <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: user.subject,
    html: user.message,
  };

  // Retorna/propaga a Promise para permitir que o caller trate erro (ex: worker da fila).
  return transporter.sendMail(emailOptions);
};

export default sendEmail;
