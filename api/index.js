// Routing stuff goes here
// Module.exports for loading pages
// processes.cwd

// Dependencies
const fs = require('fs');
const path = require('path');

// Web link for Vercel:

// Create server
module.exports = (req, res) =>{

    // Main page
    if (req.url === '/' || req.url === ''){
        fs.readFile(
            path.join(process.cwd(), 'index.html'),
            (err, content)=>{
                if(err) throw err;

                res.writeHead(200,{'Content-Type': 'text/html'});
                res.end(content);
            }
        )
    }

    //
    else if (req.url === '/api'){
        fs.readFile(
            path.join(process.cwd(), 'database.json'), 'utf-8',
            (err, content)=>{
                if(err) throw err;

                res.writeHead(200,{'Content-Type': 'application/json'});
                res.end(content);
            }
        )
    }
}