type UserSettings = {
  username?: string;
  userPassword?: string;
  userCode?: string;
};

export function messageCreateAccount(user: UserSettings) {
  return `<body style="margin:0; padding:0; background-color:#f1f3f5; font-family:'Segoe UI', Arial, sans-serif;">

  <!-- Container externo -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f3f5; padding: 40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" style="max-width:520px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header azul escuro -->
          <tr>
            <td align="center" style="background-color:#0f1f3d; padding: 36px 40px 28px;">
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 40px 40px 16px;">
              <h1 style="margin:0 0 16px; font-size:22px; font-weight:800; color:#0f1f3d; text-transform:uppercase; letter-spacing:1px;">
                Bem vindo ao psg, ${user.username}
              </h1>
              <p style="margin:0 0 24px; font-size:15px; color:#4a5568; line-height:1.6;">
                Sua conta foi criada com sucesso e agora, para acessar o sistema, você deve acessar o site utilizando a seguinte senha:
              </p>

              <!-- Botão -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td align="center" valign="middle" style="background-color:#C9A84C;border-radius:10px;padding:12px 20px;font-size:24px;font-weight:bold;text-align:center;width:120px;height:50px;">
                      ${user.userPassword}
                    </td>
                </tr>
              </table>

              <!-- Aviso de link alternativo -->
              <p style="margin:0 0 24px; font-size:15px; color:#4a5568; line-height:1.6;">
                Utilize este email e senha para fazer o primeiro login. Após isso, redefina sua senha para concluir seu cadastro.
              </p>
              <p style="margin:0 0 24px; font-size:12px; word-break:break-all;">
                <a href="${process.env.HOST}" style="color:#C9A84C; text-decoration:none;">
                  Clique aqui para acessar o sistema
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa; padding:20px 40px; border-top:1px solid #e8ecf0;">
              <p style="margin:0; font-size:12px; color:#a0aec0; text-align:center; line-height:1.5;">
                © Paris Sem Gol · Este é um email automático, não responda.
              </p>
            </td>
          </tr>

        </table>
        <!-- fim card -->

      </td>
    </tr>
  </table>

</body>`;
}

export function messageResetPassword(user: UserSettings) {
  return `<body style="margin:0; padding:0; background-color:#f1f3f5; font-family:'Segoe UI', Arial, sans-serif;">

  <!-- Container externo -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f3f5; padding: 40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" style="max-width:520px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header azul escuro -->
          <tr>
            <td align="center" style="background-color:#0f1f3d; padding: 36px 40px 28px;">
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 40px 40px 16px;">
              <h1 style="margin:0 0 16px; font-size:22px; font-weight:800; color:#0f1f3d; text-transform:uppercase; letter-spacing:1px;">
                Recuperação de senha
              </h1>
              <p style="margin:0 0 24px; font-size:15px; color:#4a5568; line-height:1.6;">
                Recebemos sua solicitação para redefinição de senha. Para prosseguir, insira o código abaixo e conclua a redefinição de sua senha.
              </p>

              <!-- Botão -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td align="center" valign="middle" style="background-color:#C9A84C;border-radius:10px;padding:12px 20px;font-size:24px;font-weight:bold;text-align:center;width:120px;height:50px;">
                      ${user.userCode}
                    </td>
                </tr>
              </table>

              <!-- Aviso de link alternativo -->
              <p style="margin:0 0 24px; font-size:15px; color:#4a5568; line-height:1.6;color: #777777; font-size: 14px;">
                Se você não reconhece esta solicitação, apenas ignore este e-mail.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa; padding:20px 40px; border-top:1px solid #e8ecf0;">
              <p style="margin:0; font-size:12px; color:#a0aec0; text-align:center; line-height:1.5;">
                © Paris Sem Gol · Este é um email automático, não responda.
              </p>
            </td>
          </tr>

        </table>
        <!-- fim card -->

      </td>
    </tr>
  </table>

</body>`;
}
