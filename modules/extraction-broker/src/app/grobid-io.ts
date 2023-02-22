// import fetch from 'node'
import {
  registerCmd,
  config,
  opt,
  YArgs
} from '~/cli/arglib'

registerCmd(
  YArgs,
  'extract-pdf',
  'Extract PDF using Grobid service',
  config(
    opt.cwd,
    opt.file('pdf'),
  ),
)(async (args: any) => {
  const { pdf } = args;

  await extractPdf(pdf)
    .then(() =>{
      console.log('success')
    });

});

async function extractPdf(pdfFile: string) {
  //
}
