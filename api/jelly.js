import {handleRequest} from '../rally-handler.js';

export default function handler(req,res){
 return handleRequest(req,res,'/api/jelly');
}
