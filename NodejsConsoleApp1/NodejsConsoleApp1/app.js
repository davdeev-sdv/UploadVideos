

const axios = require('axios')
const fs = require('fs')
const { ConcurrencyManager } = require('axios-concurrency')
const https = require('https')
const FormData = require('form-data')
const { api, token } = require('./config.json')
const MAX_CONCURRENT_REQUESTS = 25
ConcurrencyManager(axios, MAX_CONCURRENT_REQUESTS)

axios.defaults.headers.common['authorization'] = `Token token="${token}"`

const ids = [
    '224498404',
    '222887304',
    '195209104',
    '223558004']

const readFiles = (dirname, onFileReade, onError) => {
    fs.readdir(dirname, function (err, folders) {
        if (err) {
            onError(err);
            return;
        }

        folders.forEach(function (folder) {
            if (!ids.includes(folder))
            {
                return;
            }

            fs.readdir(dirname + '/' + folder, function (err, files) {
                if (err) {
                    onError(`Can't read folder ${folder}`);
                    return;
                }

                files.forEach(function (file) {
                    fs.readFile(dirname + '/' + folder + '/' + file, function (err, content) {

                        if (err) {
                            onError(`Can't read file ${file}`);
                            return;
                        }

                        onFileReade(file, content);

                    });
                }); 
            });
        });
    });
}

const onError = (message) => {
    fs.appendFile('error.txt', message + '\n', 'utf-8', (error) => {
        if (error) {
            console.log(error)
        }
    })
}

const requestUploadedVideoAndPreview = (id, basename) => {
    const videoPromise = axios.get(`https://${api}/users/${id}/videos/invitation/${basename}.320x.mp4-limit`, {
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
    })
    const posterPromise = axios.get(`https://${api}/users/${id}/videos/invitation/${basename}.x.jpg`, {
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
    })

    Promise.all([videoPromise, posterPromise])
        .then(([videoResp, posterResp]) => {
            if (videoResp.status !== 200 || posterResp.status !== 200) {
                console.error(`Poster or video not available for user ${id} with basename ${basename}`)
                onError(`Poster or video not available for user ${id} with basename ${basename}`)
                return
            }
            console.log(`Poster and video is available for user ${id} with basename ${basename}`)
        })
        .catch(error => {
            console.log(error)
            onError(`Poster or video not available for user ${id} with basename ${basename}`)
        })
}


const uploadVideo = (filename, content) => {
    const form = new FormData()
    form.append('fieldName', content, filename)
    const id = filename.split('_')[0]
    axios.post(`https://${api}/users/${id}/videos/invitation/approved`, form, {
        headers: form.getHeaders(),
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
    }).then((resp) => {
        if (resp.status !== 201 && resp.status !== 200) {
            onError(`Can't upload videofile ${filename}`)
            return
        }
        const { basename } = resp.data
        if (basename) {
            requestUploadedVideoAndPreview(id, basename)
        } else {
            requestUploadedVideoAndPreview(id, resp.data[0])
        }

    }).catch((error) => {
        console.error(error)
        onError(`Can't upload videofile ${filename}`)
    })
}

readFiles('d:\\Projects\\AF_Invites\\Videoinvites\\', uploadVideo, onError)

