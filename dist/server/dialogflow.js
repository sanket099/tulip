"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var df = require("dialogflow");
var dotenv = require("dotenv");
var uuid = require("uuid");
var fs = require("fs");
var pump = require("pump");
var through2 = require("through2");
var wav = require('wav');
dotenv.config();
var Dialogflow = (function () {
    function Dialogflow() {
        this.languageCode = 'en-US';
        this.projectId = process.env.PROJECT_ID;
        this.encoding = 'AUDIO_ENCODING_LINEAR_16';
        this.singleUtterance = true;
        this.isInitialRequest = true;
        this.detectStreamCall = null;
    }
    Dialogflow.prototype.setupDialogflow = function (meta) {
        this.sessionId = uuid.v4();
        this.sessionClient = new df.v2beta1.SessionsClient();
        this.sessionPath = this.sessionClient.sessionPath(this.projectId, this.sessionId);
        this.sampleRateHertz = meta.sampleHerz;
        this.fileWriter = new wav.FileWriter('temp/' + this.sessionId + '.wav', {
            channels: meta.channels,
            sampleRate: this.sampleRateHertz,
            bitDepth: 16
        });
    };
    Dialogflow.prototype.prepareStream = function (audio, cb) {
        var _this = this;
        var initialStreamRequest = {
            session: this.sessionPath,
            queryParams: {
                session: this.sessionClient.sessionPath(this.projectId, this.sessionId),
            },
            queryInput: {
                audioConfig: {
                    sampleRateHertz: this.sampleRateHertz,
                    audioEncoding: this.encoding,
                    languageCode: this.languageCode,
                },
                singleUtterance: this.singleUtterance
            },
            outputAudioConfig: {
                audioEncoding: 'OUTPUT_AUDIO_ENCODING_LINEAR_16',
                sampleRateHertz: 48000,
                synthesizeSpeechConfig: {
                    voice: {
                        ssmlGender: 'SSML_VOICE_GENDER_FEMALE'
                    },
                    speakingRate: 1.5,
                    pitch: 7
                }
            }
        };
        this.detectStreamCall = this.sessionClient
            .streamingDetectIntent()
            .on('error', function (e) {
            console.log(e);
        }).on('data', function (data) {
            if (data.recognitionResult) {
                console.log("Intermediate transcript:\n              " + data.recognitionResult.transcript);
            }
            else {
                console.log("Detected intent:");
                console.log(data.outputAudio);
                cb(data.outputAudio);
            }
        }).on('end', function () {
            console.log('on end');
            _this.detectStreamCall = null;
        });
        if (this.isInitialRequest) {
            this.detectStreamCall.write(initialStreamRequest);
        }
        this.fileWriter.write(audio);
    };
    Dialogflow.prototype.finalizeStream = function () {
        pump(fs.createReadStream('temp/' + this.sessionId + '.wav'), through2.obj(function (obj, _, next) {
            next(null, { inputAudio: obj });
        }), this.detectStreamCall);
        fs.unlink('temp/' + this.sessionId + '.wav', function (err) {
            if (err)
                throw console.log(err);
            console.log('Audio file was deleted');
        });
    };
    return Dialogflow;
}());
exports.Dialogflow = Dialogflow;
exports.dialogflow = new Dialogflow();
//# sourceMappingURL=dialogflow.js.map