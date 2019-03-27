/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

declare var MediaRecorder: any;

let wai = require('web-audio-ios');


const SELECTORS = {
    AUDIO_ELEMENT: '.audio_element',
    MIC_RECORD_BUTTON: '.microphone__record_button',
    AUDIO_FILE: '.microphone__file'
  };

/** Initializes and manages interaction with the camera */
export class Microphone {
    /** The HTMLAudioElement used to play audio from the microphone */
    audioElement: HTMLAudioElement;
    recordButton: HTMLElement;
    fileElement: HTMLElement;
    outputChunks: Array<any>;
    mediaRecorder: any;
    fileReader: any;
    audioContext: any;
    meta: any;
    source: MediaStreamAudioSourceNode;
    outputSource: any;
    scriptProcessor: ScriptProcessorNode;

    constructor() {
        this.fileReader = new FileReader();
        this.outputChunks = [];
        this.meta = {};
        this.recordButton =
        <HTMLElement>document.querySelector(SELECTORS.MIC_RECORD_BUTTON);
    }

  /**
   * Requests access to the microphone
   *
   * @async
   */
  async setupMicrophone() {
    let me = this;
    me.audioContext = new AudioContext();

    me.setupButtons();

    this.audioElement =
    <HTMLAudioElement>document.querySelector(SELECTORS.AUDIO_ELEMENT);

    // iOS unlock fix
    wai(document.body, this.audioContext, function (unlocked: any) {});

    // iOS locks the audioContext so let's unlock it
    /*if(me.audioContext.state === 'suspended' && 'ontouchstart' in window) {
      let unlock = function(){
        // me.audioContext.resume().then(function(){
        //    document.body.removeEventListener('touchend', unlock);
        // });

        alert("unlock");
        // Create empty buffer
        let buffer = me.audioContext.createBuffer(1, 1, 22050);
        me.outputSource = me.audioContext.createBufferSource();
        me.outputSource.audioContext = buffer;
        // Connect to output (speakers)
        me.outputSource.connect(me.audioContext.destination);
        // Play sound
        // play the file
        me.outputSource.noteOn(0);


        // by checking the play state after some time, we know if we're really unlocked
        setTimeout(function() {
          if((source.playbackState === source.PLAYING_STATE || source.playbackState === source.FINISHED_STATE)) {
            isUnlocked = true;
          }
        }, 0);


      };
      document.body.addEventListener('touchend', unlock, false);
    }*/

    me.meta.sampleHerz = me.audioContext.sampleRate;
    me.meta.channels = me.audioContext.destination.numberOfInputs;

    await navigator.mediaDevices.getUserMedia({ audio: {
      deviceId: 'mic',
    } })
        .then(function(s: MediaStream) {
          me.mediaRecorder = new MediaRecorder(s);
          me.getMicStream(s);

          me.mediaRecorder.addEventListener('start', (e:any) => {
            me.outputChunks = [];

            let event = new CustomEvent('start', {
              detail: 'start'
            });
            window.dispatchEvent(event);

            me.source.connect(me.scriptProcessor);
            me.scriptProcessor.connect(me.audioContext.destination);
          });

          me.mediaRecorder.addEventListener('stop', (e:any) => {
            me.source.disconnect();
            me.scriptProcessor.disconnect();
          });
    }).catch(function(e){
      console.log(e);
    });

    /*return new Promise(resolve => {
      resolve(me.meta);
    });*/
    return me.meta;
  }

  setupButtons(){
    let me = this;
    me.recordButton.className = 'btn microphone__record_button';

    this.recordButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      me.recordButton.className = 'btn microphone__record_button active';
      this.mediaRecorder.start();
    });

    this.recordButton.addEventListener('touchend', () => {
      me.recordButton.className = 'btn microphone__record_button';
      this.mediaRecorder.stop();
      let event = new CustomEvent('stop', {
        detail: 'stop'
      });
      window.dispatchEvent(event);
    });
  }

  getMicStream(s: any){
    const bufferLength = 4096;
    this.source = this.audioContext.createMediaStreamSource(s);

    this.scriptProcessor =
      this.audioContext.createScriptProcessor(bufferLength,1,1);

      this.scriptProcessor.onaudioprocess = (e)=> {
        let stream = e.inputBuffer.getChannelData(0) ||
        new Float32Array(bufferLength);
        let event = new CustomEvent('audio', {
          detail: this.convertFloat32ToInt16(stream)
        });
        window.dispatchEvent(event);
      };
  }

  /*
   * When working with Dialogflow and Dialogflow matched an intent,
   * and returned an audio buffer. Play this output.
   */
  playOutput(arrayBuffer:any){
    let me = this;

    try {
      // TODO why do I call this twice?
      if(arrayBuffer.byteLength > 0){
        this.audioContext.decodeAudioData(arrayBuffer,
        function(buffer:any){
          me.audioContext.resume(); //iOS?
          me.outputSource = me.audioContext.createBufferSource();
          me.outputSource.connect(me.audioContext.destination);
          me.outputSource.buffer = buffer;
          me.outputSource.start(0);
          //me.outputSource.noteOn(0); //iOS?
        },
        function(){
          console.log(arguments);
        });
      }
    } catch(e) {
      console.log(e);
    }

  }

  convertFloat32ToInt16(buffer:any){
      let l = buffer.length;
      let buf = new Int16Array(l);
      while (l--) {
          buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
      }
      return buf.buffer;
  }
  convertInt16ToFloat32(buffer: any) {
    let l = buffer.length;
    let output = new Float32Array(buffer.length-0);
    for (let i = 0; i < l; i++) {
        let int = buffer[i];
        // If the high bit is on, then it is a negative number,
        // and actually counts backwards.
        let float = (int >= 0x8000) ? -(0x10000 - int) / 0x8000 : int / 0x7FFF;
        output[i] = float;
    }
    return output;
  }
}

export let microphone = new Microphone();
