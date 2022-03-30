/* tslint:disable:no-console */
import 'dotenv/config';
import { DirectThreadEntity, Feed, IgApiClient } from 'instagram-private-api';
import { readFileSync,createWriteStream,unlinkSync,writeFile,existsSync } from 'fs';
import ytdl = require("ytdl-core");
const ffmpegPath = 'ffmpeg.exe';
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

function fakeSave(data: object) {
    // here you would save it to a file/database etc.
    // you could save it to a file: writeFile(path, JSON.stringify(data))
    writeFile('session.json',JSON.stringify(data),function(err){if(err){return console.log(err)}});
    return data;
  }
  
  function fakeExists() {
    if(existsSync('session.json'))
        return true;
    return false;
  }
  
  function fakeLoad() {
    let session=readFileSync('session.json');
    return session;
  }
  async function main_loop(ig:IgApiClient) {
    console.log("Checking for new messages..");
    const items = await ig.feed.directInbox().items();

    const unread = items.filter(x => x.read_state > 0);  
    
  
    
    await Promise.all(unread.map(async (user)=>{
      
        let msg=user.last_permanent_item.text===undefined?user.last_permanent_item.link.text : user.last_permanent_item.text;
      
  
      const thread=ig.entity.directThread(user.thread_id);
      if((user.last_permanent_item.item_type=="text" || user.last_permanent_item.item_type=="link" )&&  msg[0]=="!"){
          let cmd=msg.split(" ");
          if(cmd[0].toLowerCase()=="!help"){
             await thread.broadcastText('Use !play https://www.youtube.com/watch?v=dIH1nOPvrQ0');
          }else if(cmd[0].toLowerCase()=="!play"){
              // thread.broadcastText('Soon!');
              if(cmd.length<2){
                 await thread.broadcastText('Use !play https://www.youtube.com/watch?v=dIH1nOPvrQ0');
              }else{
                     
                      let videoInfo=await ytdl.getBasicInfo(cmd[1])
                  console.log( videoInfo.player_response.videoDetails.lengthSeconds);
                   ytdl(cmd[1]).pipe(createWriteStream(videoInfo.player_response.videoDetails.videoId+'.mp4')).on('finish',function(){
                       ffmpeg(videoInfo.player_response.videoDetails.videoId+'.mp4')
                      .inputFormat("mp4")
                      .setStartTime('00:00:00')
                      .setDuration('60')
                      .output(videoInfo.player_response.videoDetails.videoId+'60.mp4')
                      .on('end', function(err) {
                          if(!err) { console.log('conversion Done');
                          let audio=readFileSync(videoInfo.player_response.videoDetails.videoId+'60.mp4');
                          (async () => {
                          await thread.broadcastVoice({file: audio});
                      })();
                              unlinkSync(videoInfo.player_response.videoDetails.videoId+'.mp4');
                              unlinkSync(videoInfo.player_response.videoDetails.videoId+'60.mp4');
                              
                      }
                      })
                      .on('error', function(err){
                          console.log('error: ', err)
                      }).run()  
                  });
  
  
             
              }
          }else if(cmd[0].toLowerCase()=="!seno"){
              
              let audio=readFileSync('seno.mp4')
              await thread.broadcastVoice({file: audio})
          
          }else{
              await thread.broadcastText('Unknown command');
          }
          // if(user.last_permanent_item.item_type=='link'){
          //     user.last_permanent_item.link.link_context.link_url;
          // }
      
      }
      //console.log(`${user.thread_title} ${msg}`);
      ig.directThread.markItemSeen(user.thread_id,user.last_permanent_item.item_id);
          
      }));
    console.log("done");
        
  }

(async () => {
  const ig = new IgApiClient();
  ig.state.generateDevice(process.env.IG_USERNAME);
  ig.state.proxyUrl = process.env.IG_PROXY;
//   ig.request.end$.subscribe(async () => {
//     const serialized = await ig.state.serialize();
//     delete serialized.constants; // this deletes the version info, so you'll always use the version provided by the library
//     fakeSave(serialized);
//   });
//   if (fakeExists()) {
//     // import state accepts both a string as well as an object
//     // the string should be a JSON object
//     await ig.state.deserialize(fakeLoad());
//   }
  const auth = await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
  const items = await ig.feed.directInbox().items();
  
   setInterval(function(){main_loop(ig);},15000);

})();