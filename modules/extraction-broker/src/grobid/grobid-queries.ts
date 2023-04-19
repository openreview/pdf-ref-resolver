import _ from 'lodash';
import * as E from 'fp-ts/lib/Either'

import axios, {
  AxiosRequestConfig,
  AxiosInstance,
} from 'axios';

import FormData from 'form-data';
import fs from 'fs';
import { putStrLn } from '~/util/pretty-print';


/** 
 * ! Default timeout is set very high bc first call to grobid
 */
export function grobidReq(timeoutMS: number = 200000): AxiosInstance {
  const config: AxiosRequestConfig = {
    baseURL: 'http://localhost:8070/',
    timeout: timeoutMS,
    headers: {
    },
    responseType: 'document'
  };

  return axios.create(config);
}

export async function grobidProcessReferences(pdfFile: string): Promise<E.Either<string[], string>> {
  const data = new FormData()
  data.append('input', fs.createReadStream(pdfFile))

  return await grobidReq()
    .post('/api/processReferences', data, {
      headers: data.getHeaders()
    })
    .then((resp) => E.right(resp.data))
    .catch((error: Error) => E.left([error.name,  error.message]))
}

export async function grobidIsAlive(): Promise<boolean> {
  return await grobidReq(1000)
    .get('/api/isalive')
    .then((resp) => {
      putStrLn(`grobidIsAlive: ${resp.data}`);
      return true;
    })
    .catch((error: Error) => {
      putStrLn(`grobidIsAlive/error: ${error.message}`);
      return false;
    });
}

///////
/// Grobid Rest Api
//
// POST    /api/annotatePDF (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                                    
// POST    /api/citationPatentAnnotations (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                      
// GET     /api/grobid (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                                         
// GET     /api/health (org.grobid.service.resources.HealthResource)                                                                                                                                                                                                                                  
// GET     /api/isalive (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                                        
// GET     /api/model (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                                          
// POST    /api/model (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                                          
// POST    /api/modelTraining (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                                  
// POST    /api/processAffiliations (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                            
// PUT     /api/processAffiliations (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                            
// POST    /api/processCitation (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                                
// PUT     /api/processCitation (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                                
// POST    /api/processCitationList (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                            
// POST    /api/processCitationNames (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                           
// PUT     /api/processCitationNames (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                           
// POST    /api/processCitationPatentPDF (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                       
// POST    /api/processCitationPatentST36 (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                      
// POST    /api/processCitationPatentTXT (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                       
// POST    /api/processDate (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                                    
// PUT     /api/processDate (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                                    
// POST    /api/processFulltextAssetDocument (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                   
// PUT     /api/processFulltextAssetDocument (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                   
// POST    /api/processFulltextDocument (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                        
// PUT     /api/processFulltextDocument (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                        
// POST    /api/processHeaderDocument (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                          
// PUT     /api/processHeaderDocument (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                          
// POST    /api/processHeaderNames (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                             
// PUT     /api/processHeaderNames (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                             
// POST    /api/processReferences (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                              
// PUT     /api/processReferences (org.grobid.service.GrobidRestService)                                                                                                                                                                                                                              
// POST    /api/referenceAnnotations (org.grobid.service.GrobidRestService)
// POST    /api/trainingResult (org.grobid.service.GrobidRestService)
// GET     /api/version (org.grobid.service.GrobidRestService)