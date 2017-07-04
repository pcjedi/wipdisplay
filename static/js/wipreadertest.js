var reader = new FileReaderSync();
var buffer;

self.addEventListener('message', function(e) {
    start=Date.now()
    var files = e.data;
    buffer = {};
    [].forEach.call(files, function(file) {
        buffer[file.name]={};
        buffer[file.name]["DataClassNames"]={};
        buffer[file.name]["DataTags"]={};
        var RootTag=readTag(file);
        var DataTag=queryTag(file,RootTag,["Data"]).Data;
        readDataTags(file,DataTag);
    });
    [].forEach.call(files, function(file) {
        sortDataTags(file)
    });
    [].forEach.call(files, function(file) {
        readTDGraphs(file)
    });
    [].forEach.call(files, function(file) {
        readinfo(file)
    });
    console.log("info read",Date.now()-start);
    [].forEach.call(files, function(file) {
        readData(file)
        m={done:{}};
        m.done[file.name]=null
        postMessage(m);
    });
    console.log(Date.now()-start,buffer);
    buffer={};
}, false);
function readData(file) {
    var b = buffer[file.name]
    for (gid in b.TDGraph) {
        g=b.TDGraph[gid]
        g.GraphData.Data=readDataTagData(file,g.GraphData.Data,g.GraphData.DataType)
        li=g.GraphData.Data.length
        ls=g.SizeX*g.SizeY*g.SizeGraph
        if (li==ls) {
            m={}
            m.data={}
            m.data[file.name]={}
            m.data[file.name][gid]=g.GraphData.Data
            postMessage(m)
        }
    }
}
function readinfo(file) {
    var b = buffer[file.name];
    d={
        "SpaceTransformationID" : "TDSpaceTransformation",
        "XInterpretationID"     : "TDSpectralInterpretation",
        "XTransformationID"     : "TDSpectralTransformation",
        "ZInterpretationID"     : "TDZInterpretation"
    }
    for (idtag in b.ID) {
        t=d[idtag]
        for (id in b.ID[idtag]) {
            if (id in b[t]) {
                tag=b[t][id]
                tag=deepread(file,tag,["TData"])
                b[t][id]=tag
                m={}
                m.info={}
                m.info[file.name]={}
                m.info[file.name][idtag]={}
                m.info[file.name][idtag][id]=tag
                postMessage(m)
            }
        }
    }
}

function readTDGraphs(file) {
    var n = file.name;
    var b = buffer[n];
    for (gid in b.TDGraph) {
        g=b.TDGraph[gid]
        cap=g.Caption
        b.TDGraph[gid]=deepread(file,g,["Data","TData"]).TDGraph
        g=b.TDGraph[gid];
        m={}
        m.g={}
        m.g[n]={}
        m.g[n][gid]=g
        postMessage(m);
        g.Caption=cap;
        for (idtag in g) {
            if (idtag.endsWith("ID")) {
                temp={}
                temp[g[idtag]]=null
                if (!b.ID) {b.ID={}}
                if (!(idtag in b.ID)) {b.ID[idtag]={}}
                b.ID[idtag][g[idtag]]=null
            }
        }
    }
}

function deepread(file,tag, ignore) {
    if (ignore.indexOf(tag.name)!=-1) { return tag }
    if (tag.type!=0) {
        return readTagData(file,tag)
    }else{
        if (tag.start<tag.end) {
            var alltags=readTags(file,tag)
            var r={};
            for (p in alltags) {
                r[p] = deepread(file,alltags[p],ignore);
            }
            return r
        }else{ return tag }
    }
}
function readDataTags(file,dataTag) {
    var pos=dataTag.start
    while (pos<dataTag.end) {
        var tag=readTag(file,pos)
        if (!tag.name.startsWith("Data")) {pos=tag.end;continue;}
        if (tag.name.startsWith("DataClassName ")) {
           var cl = readTagData(file,tag);
           var cl_n = parseInt(tag.name.split(" ")[1]);
           buffer[file.name]["DataClassNames"][cl_n]=cl;
           if (cl=="TDGraph") {
               m={addrow:{}};
               m.addrow[file.name]={};
               postMessage(m);
           }
        }else{
            var cl_n = parseInt(tag.name.split(" ")[1]);
            buffer[file.name]["DataTags"][cl_n]=tag;
        }
        pos=tag.end

    }
}
function sortDataTags(file){
    var fn = file.name;
    for (cl_n in buffer[fn]["DataTags"]) {
        var cl = buffer[fn]["DataClassNames"][cl_n];
        var tag = buffer[fn]["DataTags"][cl_n];
        if (!(cl in buffer[fn])) {buffer[fn][cl]={};}
        if (cl=="TDGraph") {
            var idnc=readDataTagIDandCaption(file,tag);
            var id = idnc.ID;
            var cap = idnc.Caption;
            buffer[fn][cl][id]=tag;
            buffer[fn][cl][id]["Caption"]=cap;
            m={rows:{}};
            m.rows[fn]={};
            m.rows[fn][id]=tag;
            m.rows[fn][id].Caption=cap;
            postMessage(m);
        }else{
            id=readDataTagID(file,tag)
            buffer[fn][cl][id]=tag
        }
    }
}
function readDataTagID(file,tag) {
    var TDataTag=queryTag(file,tag,["TData"]).TData;
    var IDTag = queryTag(file,TDataTag,["ID"]).ID;
    id = readTagData(file,IDTag)
    return id
}
function readDataTagIDandCaption(file,tag) {
    var TDataTag=queryTag(file,tag,["TData"]).TData;
    var idandcaptag = queryTag(file,TDataTag,["ID","Caption"])
    var IDTag=idandcaptag.ID;
    var CapTag = idandcaptag.Caption;
    var r = {};
    r["ID"]=readTagData(file,IDTag);
    r["Caption"]=readTagData(file,CapTag);
    return r
}
function readTags(file,source_tag){
    var content={}
    if (source_tag.type!==0) {throw source_tag.name+" not type 0"}
    var pos=source_tag.start 
    while (pos<source_tag.end) {
        var tag = readTag(file,pos)
        content[tag.name]=tag
        pos=tag.end
    }
    return content    
}
function readDataTagData(file,tag,type){
    var b=reader.readAsArrayBuffer(file.slice(tag.start,tag.end));
    try {
        switch(type) {
            case 2:
                return new Int32Array(b);
            case 3:
                return new Int16Array(b);
            case 4:
                return new Int8Array(b);
            case 5:
                return new Uint32Array(b);
            case 6:
                return new Uint16Array(b);
            case 7:
                return new Uint8Array(b);
            case 9:
                return new Float32Array(b);
        }
    }catch(err) {console.log(err);return tag}
}
function readTagData(file, tag) {
    if (tag.type==9) {
        return reader.readAsBinaryString(file.slice(tag.start+4,tag.end))
    }
    if (tag.type==0) { return deepread(file,tag,[]) }
    var b=reader.readAsArrayBuffer(file.slice(tag.start,tag.end));
    var r;
    try {
    switch(tag.type){
        case 2:
            r=new Float64Array(b);
            break;
        case 3:
            r=new Float32Array(b);
            break;
        case 5:
            r= new Uint32Array(b);
            break;
        case 6:
            r= new Int32Array(b);
            break;
        case 8:
            r= new Uint8Array(b);
            break;
        default:
            throw "Type not understood";     
    }
    }catch(err){ console.log(err,tag);return tag}
    if (r.length==1) {return r[0]}
    return r
}
function queryTag(file,source_tag,querys){
    if (source_tag.type!==0) {throw source_tag.name+" not type 0"}
    pos=source_tag.start
    var counter=0;
    var r={}
    while (pos<source_tag.end) {
        tag = readTag(file,pos)
        if (querys.indexOf(tag.name)!=-1) {
            r[tag.name]=tag;
            counter++;
            if (counter == querys.length){ return r; }
        }
        pos=tag.end
    }
    var rex=[]
    for (var i=0;i<querys.length;i++) { 
        q=querys[i];
        if (!(q in r)) {rex.push(q)} }
    console.log(querys);
    console.log(rex);
    console.log(r);
    throw "no "+rex+" in "+source_tag.name
}
function readTag(file, pos) {
    pos = pos || 8
    var nameL_b = reader.readAsArrayBuffer(file.slice(pos,pos+4));
    var nameL = new Uint32Array(nameL_b)[0];
    var etr_temp = reader.readAsArrayBuffer(file.slice(pos+4,pos+4+nameL+20));
    var etr_name = new Uint8Array(etr_temp.slice(0,nameL));
    var etr_tse = new Uint32Array(etr_temp.slice(nameL));
    var name = String.fromCharCode.apply(null,etr_name);
    var type = etr_tse[0];
    var start = etr_tse[1] + etr_tse[2] * Math.pow(2,32);
    var end = etr_tse[3] + etr_tse[4] * Math.pow(2,32);
    return {"name":name, "start":start, "end":end, "type":type}
}

function readAllTags(file, start, stop) {
    start = start || 8
    stop = typeof stop !=="undefined" ? stop : file.size;
    var content = {}
    pos = start
    while (pos<stop) {
        tag = readTag(file,pos)
        if (tag["type"]==0 & parseInt(tag["start"])<parseInt(tag["end"])) {
            content[tag["name"]]=readAllTags(file, tag["start"], tag["end"])
        }else{ 
            if (tag["type"]!==0) {
                content[tag["name"]]={"type":tag["type"], "start":tag["start"], "end":tag["end"]};
            }
        }
        pos=tag["end"];
    }
    return content
}
