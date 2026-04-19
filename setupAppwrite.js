const ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const PROJECT = "69e4f8980019f8196e7b";
const KEY = "standard_7726ab4884992d00461ec9c42479a8d365c64f4ae74d9244d76c1f763fbf4b0090e21d98f798ab35eb1d6029bac9d775c975d617d31cedb53d48e2d658473744fbac38834ad253a0c4cb1f4200262f99c1837fece6ee007351c936b94bf96751f380cce6b5c4adde9f45964e3c84c3948d0aa500256323b906695eb1af61ccec";
const DB_ID = "69e4fb2b003213a395fe";

async function req(path, method, body) {
    const res = await fetch(`${ENDPOINT}${path}`, {
        method,
        headers: {
            "X-Appwrite-Project": PROJECT,
            "X-Appwrite-Key": KEY,
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if(!res.ok && res.status !== 409) { // 409 is 'already exists', which is fine
        console.error("Error", data);
    }
    return data;
}

const schemas = [
  { id: 'favorites', name: 'Favorites', attrs: [ { key: 'userId', type: 'string' }, { key: 'videoId', type: 'string' } ] },
  { id: 'watch_later', name: 'Watch Later', attrs: [ { key: 'userId', type: 'string' }, { key: 'videoId', type: 'string' } ] },
  { id: 'history', name: 'History', attrs: [ { key: 'userId', type: 'string' }, { key: 'videoId', type: 'string' } ] },
  { id: 'playlists', name: 'Playlists', attrs: [ { key: 'authorId', type: 'string' }, { key: 'title', type: 'string' }, { key: 'description', type: 'string', size: 10000 }, { key: 'privacy', type: 'string', size: 50 }, { key: 'videoIds', type: 'string', array: true } ] },
  { id: 'notifications', name: 'Notifications', attrs: [ { key: 'userId', type: 'string' }, { key: 'fromUserId', type: 'string' }, { key: 'fromUserName', type: 'string' }, { key: 'fromUserAvatar', type: 'string', size: 5000 }, { key: 'type', type: 'string', size: 50 }, { key: 'videoId', type: 'string' }, { key: 'videoTitle', type: 'string' }, { key: 'commentText', type: 'string', size: 10000 }, { key: 'read', type: 'boolean' } ] },
  { id: 'subscriptions', name: 'Subscriptions', attrs: [ { key: 'userId', type: 'string' }, { key: 'channelId', type: 'string' } ] },
  { id: 'community_posts', name: 'Community Posts', attrs: [ { key: 'authorId', type: 'string' }, { key: 'authorName', type: 'string' }, { key: 'authorPhotoUrl', type: 'string', size: 5000 }, { key: 'text', type: 'string', size: 10000 }, { key: 'type', type: 'string', size: 50 }, { key: 'likes', type: 'integer' }, { key: 'options', type: 'string', array: true }, { key: 'votes', type: 'string', size: 10000 } ] },
  { id: 'video_likes', name: 'Video Likes', attrs: [ { key: 'userId', type: 'string' }, { key: 'videoId', type: 'string' } ] },
  { id: 'video_ices', name: 'Video Ices', attrs: [ { key: 'userId', type: 'string' }, { key: 'videoId', type: 'string' } ] },
  { id: 'hidden_channels', name: 'Hidden Channels', attrs: [ { key: 'userId', type: 'string' }, { key: 'channelId', type: 'string' } ] },
  { id: 'admin_settings', name: 'Admin Settings', attrs: [ { key: 'key', type: 'string' }, { key: 'value', type: 'string', size: 10000 } ] },
  { id: 'music_registry', name: 'Music Registry', attrs: [ { key: 'title', type: 'string' }, { key: 'author', type: 'string' }, { key: 'duration', type: 'string', size: 50 }, { key: 'url', type: 'string', size: 5000 }, { key: 'authorPhotoUrl', type: 'string', size: 5000 }, { key: 'uses', type: 'integer' } ] }
];

async function run() {
  console.log("Updating permissions for ALL collections to allow read/write...");
  const existingCols = await req(`/databases/${DB_ID}/collections`, "GET");
  if(existingCols && existingCols.collections) {
    for(let c of existingCols.collections) {
      await req(`/databases/${DB_ID}/collections/${c.$id}`, "PUT", {
        name: c.name,
        permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
        documentSecurity: false,
        enabled: true
      });
    }
  }

  for(let s of schemas) {
    console.log("Creating " + s.id);
    await req(`/databases/${DB_ID}/collections`, "POST", { collectionId: s.id, name: s.name, permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'], documentSecurity: false });
    await new Promise(r => setTimeout(r, 1000));
    for(let a of s.attrs) {
        let path = "";
        let body = { key: a.key, required: false, array: !!a.array };
        if(a.type === 'string') { path = `/databases/${DB_ID}/collections/${s.id}/attributes/string`; body.size = a.size || 255; } 
        else if(a.type === 'integer') { path = `/databases/${DB_ID}/collections/${s.id}/attributes/integer`; } 
        else if(a.type === 'boolean') { path = `/databases/${DB_ID}/collections/${s.id}/attributes/boolean`; }
        await req(path, "POST", body);
        await new Promise(r => setTimeout(r, 500));
    }
  }
  console.log("All tables deployed!");
}
run();
