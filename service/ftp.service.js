require('dotenv/config');
const ftp = require("basic-ftp");
const GeneralError = require('../classes/GeneralError.class');

module.exports = {
    async createFtpClient() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    await client.access({
      host: process.env.FTP_HOST,
      port: process.env.FTP_PORT,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false
    });
    console.log(await client.list())

    return client;
  },
  async deleteFileFromFtp(id) {
    if(!id) throw new GeneralError("O id do usuário é obrigatório", 400)
    const client = await this.createFtpClient();
    await client.cd("/sandbox/6afa10fc-7173-4d6e-82c1-1ec4f709e721/modals-template/docusign/");
    
    const fileList = await client.list();
    const fileExists = fileList.some(file => file.name === `signing-${id}.html`);
    if (fileExists) await client.remove(`/sandbox/6afa10fc-7173-4d6e-82c1-1ec4f709e721/modals-template/docusign/signing-${id}.html`);
    client.close();
    if (!fileExists) throw new GeneralError("Arquivo não encontrado", 404);
  }
};