// ===== IndexedDB setup =====
let db;
let request = indexedDB.open("OTT_DB",1);
request.onupgradeneeded = e=>{
    db = e.target.result;
    if(!db.objectStoreNames.contains("movies")) db.createObjectStore("movies",{keyPath:"id",autoIncrement:true});
    if(!db.objectStoreNames.contains("webseries")) db.createObjectStore("webseries",{keyPath:"id",autoIncrement:true});
};
request.onsuccess = e=>{
    db = e.target.result;
    autoLogin();
    loadContent();
};

// ===== Auth =====
function toggleForm(){
    let l=document.getElementById("loginForm"), s=document.getElementById("signupForm");
    let t=document.getElementById("formTitle"), toggle=document.getElementById("toggle");
    if(l.style.display==="none"){ l.style.display="block"; s.style.display="none"; t.innerText="Login"; toggle.innerHTML='Don’t have an account? <a onclick="toggleForm()">Signup</a>'; }
    else{ l.style.display="none"; s.style.display="block"; t.innerText="Signup"; toggle.innerHTML='Already have an account? <a onclick="toggleForm()">Login</a>'; }
}

document.getElementById("signupForm").addEventListener("submit", e=>{
    e.preventDefault();
    let u=document.getElementById("signupUsername").value.trim();
    let p=document.getElementById("signupPassword").value.trim();
    if(localStorage.getItem(u)){ alert("User exists!"); return; }
    localStorage.setItem(u,p); alert("Signup successful!"); toggleForm();
});

document.getElementById("loginForm").addEventListener("submit", e=>{
    e.preventDefault();
    let u=document.getElementById("loginUsername").value.trim();
    let p=document.getElementById("loginPassword").value.trim();
    if(localStorage.getItem(u)!==p){ alert("Wrong username or password"); return; }
    localStorage.setItem("loggedInUser",u); loadDashboard(u);
});

function autoLogin(){
    let u=localStorage.getItem("loggedInUser");
    if(u) loadDashboard(u);
}

function loadDashboard(user){
    document.getElementById("authBox").style.display="none";
    document.getElementById("dashboard").style.display="block";
    document.getElementById("logoutBtn").style.display="block";
    if(user==="khulesh" && localStorage.getItem(user)==="khulesh26") document.getElementById("adminPanel").style.display="block";
    loadContent();
}

function logout(){
    localStorage.removeItem("loggedInUser");
    document.getElementById("dashboard").style.display="none";
    document.getElementById("authBox").style.display="block";
    document.getElementById("logoutBtn").style.display="none";
}

// ===== Admin Forms =====
function showUploadForm(type){
    document.getElementById("movieForm").style.display = (type==="movie")?"block":"none";
    document.getElementById("webseriesForm").style.display = (type==="webseries")?"block":"none";
    if(type==="webseries") document.getElementById("episodesContainer").innerHTML="";
}

function generateEpisodes(){
    let count = parseInt(document.getElementById("wsEpisodesCount").value);
    let container = document.getElementById("episodesContainer"); container.innerHTML="";
    for(let i=1;i<=count;i++){
        let label = document.createElement("label"); label.innerText = "Episode "+i+": ";
        let input = document.createElement("input"); input.type="file"; input.accept="video/mp4,video/x-matroska"; input.id="ep"+i; input.required=true;
        container.appendChild(label); container.appendChild(input); container.appendChild(document.createElement("br"));
    }
}

// ===== Movie Upload =====
document.getElementById("movieForm").addEventListener("submit", e=>{
    e.preventDefault();
    let title=document.getElementById("movieTitle").value.trim();
    let category=document.getElementById("movieCategory").value;
    let poster=document.getElementById("moviePoster").files[0];
    let video=document.getElementById("movieFile").files[0];
    if(!title||!category||!poster||!video) return;

    let r1=new FileReader(); r1.onload=function(){
        let posterData=r1.result;
        let r2=new FileReader(); r2.onload=function(){
            let videoData=r2.result;
            let tx=db.transaction("movies","readwrite"); let store=tx.objectStore("movies");
            store.add({title,category,poster:posterData,video:videoData});
            tx.oncomplete=function(){ loadContent(); alert("Movie Added!"); document.getElementById("movieForm").reset(); }
        }; r2.readAsDataURL(video);
    }; r1.readAsDataURL(poster);
});

// ===== Web Series Upload =====
document.getElementById("webseriesForm").addEventListener("submit", e=>{
    e.preventDefault();
    let title=document.getElementById("wsTitle").value.trim();
    let category=document.getElementById("wsCategory").value;
    let banner=document.getElementById("wsBanner").files[0];
    let count=parseInt(document.getElementById("wsEpisodesCount").value);
    if(!title||!category||!banner||!count) return;

    let r=new FileReader(); r.onload=function(){
        let bannerData=r.result;
        let episodes = [];
        let readCount = 0;
        for(let i=1;i<=count;i++){
            let file=document.getElementById("ep"+i).files[0];
            let fr=new FileReader();
            fr.onload=(function(index){ return function(ev){ episodes[index]=ev.target.result; readCount++; if(readCount===count){ 
                    let tx=db.transaction("webseries","readwrite"); let store=tx.objectStore("webseries");
                    store.add({title,category,banner:bannerData,episodes}); tx.oncomplete=function(){ loadContent(); alert("Web Series Added!"); document.getElementById("webseriesForm").reset(); document.getElementById("episodesContainer").innerHTML=""; }
                }} })(i-1); fr.readAsDataURL(file);
        }
    }; r.readAsDataURL(banner);
});

// ===== Load Content with Edit/Delete =====
function loadContent() {
    let list = document.getElementById("contentList"); 
    list.innerHTML = "";
    if(!db) return;

    // Movies
    let tx=db.transaction("movies","readonly"); 
    let store=tx.objectStore("movies");
    store.getAll().onsuccess=function(e){
        let movies=e.target.result;
        movies.forEach(m=>{
            let div=document.createElement("div"); div.className="movie-item";
            div.innerHTML=`
                <img src="${m.poster}">
                <h3>${m.title}</h3>
                ${isAdmin()?`<button onclick="editMovie(${m.id})">Edit</button>
                <button onclick="deleteMovie(${m.id})">Delete</button>`:""}
            `;
            div.onclick=()=>playVideo(m.title,m.video);
            list.appendChild(div);
        });
    };

    // Web Series
    let tx2=db.transaction("webseries","readonly"); 
    let store2=tx2.objectStore("webseries");
    store2.getAll().onsuccess=function(e){
        let series=e.target.result;
        series.forEach(s=>{
            let div=document.createElement("div"); div.className="movie-item";
            div.innerHTML=`
                <img src="${s.banner}">
                <h3>${s.title}</h3>
                ${isAdmin()?`<button onclick="editWebseries(${s.id})">Edit</button>
                <button onclick="deleteWebseries(${s.id})">Delete</button>`:""}
            `;
            div.onclick=()=>selectEpisode(s);
            list.appendChild(div);
        });
    };
}

// ===== Admin Check =====
function isAdmin(){
    let user=localStorage.getItem("loggedInUser");
    return user==="khulesh" && localStorage.getItem(user)==="khulesh26";
}

// ===== Delete =====
function deleteMovie(id){
    if(confirm("Are you sure you want to delete this movie?")){
        let tx=db.transaction("movies","readwrite");
        let store=tx.objectStore("movies");
        store.delete(id);
        tx.oncomplete = ()=> loadContent();
    }
}
function deleteWebseries(id){
    if(confirm("Are you sure you want to delete this web series?")){
        let tx=db.transaction("webseries","readwrite");
        let store=tx.objectStore("webseries");
        store.delete(id);
        tx.oncomplete = ()=> loadContent();
    }
}

// ===== Edit (Simple alert, can extend to show edit form) =====
function editMovie(id){ alert("Edit functionality can be added here for Movie ID: "+id);}
function editWebseries(id){ alert("Edit functionality can be added here for Web Series ID: "+id);}

// ===== Video Player =====
function playVideo(title,src){
    let popup=document.getElementById("popupPlayer");
    let video=document.getElementById("popupVideo");
    video.src=src;
    popup.style.display="flex";
    video.play();
}
function closePopup(){
    let popup=document.getElementById("popupPlayer");
    let video=document.getElementById("popupVideo");
    video.pause(); video.src="";
    popup.style.display="none";
}

// ===== Web Series Episode Selection =====
function selectEpisode(series){
    let ep=prompt("Select Episode (1-"+series.episodes.length+") for "+series.title);
    let index=parseInt(ep)-1;
    if(index>=0 && index<series.episodes.length) playVideo(series.title+" Episode "+ep, series.episodes[index]);
}

// ===== Search =====
function searchContent(){
    let input=document.getElementById("searchInput").value.toLowerCase();
    let grid=document.getElementById("contentList");
    Array.from(grid.children).forEach(item=>{
        let title=item.querySelector("h3").innerText.toLowerCase();
        if(title.includes(input)) item.style.display="flex";
        else item.style.display="none";
    });
}