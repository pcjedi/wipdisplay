var fuis; //file-upload-infos
var worker = new Worker("/static/js/wipreadertest_skedit.js");
   worker.onmessage = function(e) {
       action_dict= {
                        done        : table_done,
                        addrow      : graph_found,
                        rows        : graph_identified,
                        g           : graph_info,
                        info        : additional_info,
                        data        : graph_data
                    }
    for (action in e.data) {
        if (action in action_dict) {action_dict[action](e.data[action])}
        else {console.log(e.data)}
    }
   };
   worker.onerror = function(e) {
     var s = ['ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join('');
     console.log(s);
   };
document.getElementById("uploadfile2").addEventListener('change', function(e) {
   if (this.files.length==0) {return;}
   fe=document.getElementById("files");
   fe.innerHTML="";
   fuis={}
   create_tables(this.files, fe);
   worker.postMessage(this.files);
}, false);
function table_done(d) {
    for (fn in d) {
        $('div#'+fuis[fn].id+" i").remove()
        $('div#'+fuis[fn].id+" tbody tr :first").click()
    }
}
info_dict=  {
                SpaceTransformationID   :null,
                XInterpretationID       :null,
                XTransformationID       :null,
                ZInterpretationID       :null
            }
function additional_info(a) {
    for (fn in a) {
        $fn=$("#"+fuis[fn].id)
        for (IDprop in a[fn]) {
            if (!(IDprop in fuis[fn] )) {fuis[fn][IDprop]={}}
            for (ID in a[fn][IDprop]) {
                fuis[fn][IDprop][ID]=a[fn][IDprop][ID]
                if (IDprop=="SpaceTransformationID") {
                    $now=$fn.find("td#"+ID+".pixelsize")
                    unit=a[fn][IDprop][ID].TDTransformation.StandardUnit
                    v=a[fn][IDprop][ID].TDSpaceTransformation.ViewPort3D.Scale[0].toFixed(2)
                    $now.text(v+" "+unit)
                }
                if (IDprop=="XTransformationID" & "XInterpretationID" in fuis[fn]) {
                    for (gid in fuis[fn].TDGraph) {
                        if (fuis[fn].TDGraph[gid].XTransformationID==ID & fuis[fn].TDGraph[gid].XInterpretationID in fuis[fn].XInterpretationID) {
                            make_raman(fn,gid)
                        }
                    }
                }
                if (IDprop=="XInterpretationID" & "XTransformationID" in fuis[fn]) {
                    for (gid in fuis[fn].TDGraph) {
                        if (fuis[fn].TDGraph[gid].XInterpretationID==ID & fuis[fn].TDGraph[gid].XTransformationID in fuis[fn].XTransformationID) {
                            make_raman(fn,gid)
                        }
                    }
                }
            }
        }
    }
}
function make_raman(fn,gid){
    xi=fuis[fn].TDGraph[gid].XInterpretationID
    xt=fuis[fn].TDGraph[gid].XTransformationID
    var c=fuis[fn].XTransformationID[xt].TDSpectralTransformation
    var wl=fuis[fn].XInterpretationID[xi].TDSpectralInterpretation.ExcitationWaveLength
    $rmax=$('div#'+fuis[fn].id).find('tr#'+gid).find("td.rmax")
    $rmin=$('div#'+fuis[fn].id).find('tr#'+gid).find("td.rmin")

    $rmin.html(raman_shift(wl,c,0).toFixed(2) + " <sup>1</sup>&frasl;<sub>cm</sub>")
    $rmax.html(raman_shift(wl,c,fuis[fn].TDGraph[gid].SizeGraph).toFixed(2) + " <sup>1</sup>&frasl;<sub>cm</sub>")
}
function raman_shift(wl,c,i) {
    alpha=Math.asin(c.LambdaC *((( c.m / c.d) / 2) / Math.cos(c.Gamma /2 ))) -( c.Gamma / 2)
    sinalpha = Math.sin(alpha)
    betac = c.Gamma + alpha
    betah = betac + c.Delta
    hc = c.f * Math.sin(c.Delta)
    lh = c.f * Math.cos(c.Delta)
    hi = (c.x * (c.nC - i)) + hc
    betai = betah - Math.atan(hi/lh)
    wavenumber =( c.d / c.m) * (sinalpha + Math.sin(betai))
    return ((1e7)/wl) - ((1e7)/wavenumber)
}
function x_index(c,i){
    return (i-c.ModelOrigin[0])*Math.abs(c.Scale[0])+c.WorldOrigin[0]}
function y_index(c,i){
    return (i-c.ModelOrigin[1])*Math.abs(c.Scale[4])+c.WorldOrigin[1]}
function graph_data(a) {
    for (fn in a){
        for (id in a[fn]) {
            var n=fuis[fn].TDGraph[id]
            n.GraphData.Data=a[fn][id]
            var c  = fuis[fn].XTransformationID[n.XTransformationID].TDSpectralTransformation
            var wl = fuis[fn].XInterpretationID[n.XInterpretationID].TDSpectralInterpretation.ExcitationWaveLength
            var viewPort3D = fuis[fn].SpaceTransformationID[n.SpaceTransformationID].TDSpaceTransformation.ViewPort3D
            var standardunit=  fuis[fn].SpaceTransformationID[n.SpaceTransformationID].TDTransformation.StandardUnit

            datatr=document.createElement("tr")
            datatr.setAttribute("id","hr"+String(id))
            datatd=document.createElement("td")
            datatd.setAttribute("colspan","7")
            datatd.setAttribute("class","hiddenRow")
            datatd.setAttribute("id","hd"+String(id))
            div=document.createElement("div")
            div.setAttribute("class","accordian-body collapse")
            div.setAttribute("id","g"+String(fuis[fn].id)+"-"+String(id))
            div.setAttribute("align","center")
            datatd.appendChild(div)
            datatr.appendChild(datatd)
            $('div#'+fuis[fn].id+ ' tr#'+id).after(datatr)
            $('div#'+fuis[fn].id+ ' tr#'+id).attr("data-toggle","collapse")
            $('div#'+fuis[fn].id+ ' tr#'+id).attr("data-target","#g"+String(fuis[fn].id)+"-"+String(id))
            $('div#'+fuis[fn].id+ ' tr#'+id).attr("class","row-full accordion-toggle")


            var graphmargin= {top: 20, right: 1, bottom: 35, left: 60}
            var imagemargin= {top: 20, right: 70, bottom: 35, left: 30}
            var w,h,hg,wg,hi,wi,hgm,wgm,him,wim
            
            w=$("td.hiddenRow").width()
            h=$( window ).height()
    
            hg=(h-graphmargin.top-graphmargin.bottom)/3
            wg=w-graphmargin.left-graphmargin.right

            hi=(h-imagemargin.top-imagemargin.bottom)/3
            wi=w/3
            wim=wi-imagemargin.left-imagemargin.right
            him=(wim/n.SizeX)*n.SizeY
            var s=Math.max(Math.floor(Math.min(him/n.SizeY, wim/n.SizeX)),1)
            while (s*n.SizeY>h/3 & s>1 ) {s-=1}
            if (s*n.SizeY<h/10){
                w_avi = w-imagemargin.left-imagemargin.right
                s=Math.floor(w_avi/n.SizeX)

                him=s*n.SizeY
                wim=s*n.SizeX

                hg=h/3
                wg=w

            }else{
                him=s*n.SizeY
                wim=s*n.SizeX

                hg=him+imagemargin.top+imagemargin.bottom
                wg=w-wim-imagemargin.left-imagemargin.right

            }
                hi=him+imagemargin.top+imagemargin.bottom
                wi=wim+imagemargin.left+imagemargin.right

                hgm=hg-graphmargin.top-graphmargin.bottom
                wgm=wg-graphmargin.left-graphmargin.right
            
            var svg=d3.select("div#g"+String(fuis[fn].id)+"-"+String(id))
                .append("svg")
                .attr("class","image2d")
                .attr("width", wi)
                .attr("viewBox","0 0 "+wi+" "+hi)
                //.attr("height", hi)

            var svg_graph= d3.select("div#g"+String(fuis[fn].id)+"-"+String(id))
                .append("svg")
                .attr("class","graph")
                .attr("width", wg)
                //.attr("height", hg)
                .attr("viewBox","0 0 "+wg+" "+hg)
            var brush = d3.brushX()
                .extent([[0, 0], [wgm, hgm]])
                    .on("brush", brushing)
                    .on("end", brushed)
            var zoom = d3.zoom()
                .scaleExtent([1, 20])
                .translateExtent([[0, 0], [wgm, hgm]])
                .extent([[0, 0], [wgm, hgm]])
                .on("zoom", zoomed);

            function zoomed(){
                //g_graph.call(brush.move, null)
                t = d3.event.transform
                xt = t.rescaleX(x)
                draw_graph()
            }

            var g_graph = svg_graph.append("g")
                .attr("class","graphraw")
                .attr("transform", "translate("+graphmargin.left+","+graphmargin.top+")")
            g_graph.call(zoom)
            g_graph.on("dblclick.zoom",null)
            g_graph.append("g")
                .attr("class","brush")
                .call(brush)
            g_graph.on("dblclick",function(){
                   permitted_zones=[[0,n.SizeGraph]] 
                    marked_indez=[]
                   svg_graph.transition()
                    .duration(400)
                    .call(zoom.transform,d3.zoomIdentity)
                   draw_graph()
                   redraw_image()

                })
            var xt
            var x = d3.scaleLinear()
                .domain([raman_shift(wl,c,0),raman_shift(wl,c,n.SizeGraph-1)])
                .range([0,wgm])
            x_domain=[]
            x_range=[]
            for (i=0;i<n.SizeGraph;i++){
                x_domain.push(raman_shift(wl,c,i))
                x_range.push(i)
            }
            var x_ = d3.scaleLinear()
                .domain(x_domain)
                .range(x_range)
            var y = d3.scaleLinear()
                .domain([d3.min(n.GraphData.Data),d3.max(n.GraphData.Data)])
                .range([hgm,0])
            var xAxis= d3.axisBottom(x)
            var yAxis= d3.axisLeft(y)
            g_graph.append("g")
                .attr("class","xAxis")
                .attr("transform","translate(0,"+String(hgm)+")")
                .call(xAxis)
            fs=14
            g_graph.append("text")
                .attr("font-size",fs)
                .attr("text-anchor","middle")
                .attr("class","raman_shift_label")
                .attr("transform","translate("+(wgm/2)+","+(hgm+graphmargin.bottom-fs/2)+")")
                .text("Raman Shift[1/cm]")
            ylabel=svg_graph.append("text")
                .attr("font-size",fs)
                .attr("transform","translate("+(fs/2)+","+fs+")")
                .attr("class","ylabel")
                .text("CCD cts.")
            ylabel.on("click",yaxis_global_change)
            g_graph.append("g")
                .attr("class","yAxis")
                .call(yAxis.tickFormat(d3.format(".3")))
            g_graph.append("path").attr("d","")
                .attr("class","line")
                .attr("clip-path","url(#clip-"+fuis[fn].id+"-"+id+")")
            g_graph.append("defs").append("clipPath")
                .attr("id","clip-"+fuis[fn].id+"-"+id)
                .append("rect")
                .attr("width",wgm)
                .attr("height",hgm)
            
            var idata=[]
            var idata_max
            var idata_min
            for (i=0;i<n.SizeX*n.SizeY;i++) {
                line_now=n.GraphData.Data.slice(i*n.SizeGraph,(i+1)*n.SizeGraph)
                max_now=d3.max(line_now)
                min_now=d3.min(line_now)
                if (!idata_max | idata_max<max_now){idata_max=max_now}
                if (!idata_min | idata_min>min_now){idata_min=min_now}
                idata.push(d3.sum(line_now))
            }
            var imcolorscale = d3.scaleLinear()
                    .domain([d3.max(idata),d3.min(idata)/2+d3.max(idata)/2,d3.min(idata)])
                    .range(["#ff0000", "#33aa33", "#0000ff"])
                    .interpolate(d3.interpolateHcl);

            var h2imcolor = d3.scaleLinear()
                    .domain([d3.max(idata),d3.min(idata)/2+d3.max(idata)/2,d3.min(idata)])
                    .range([0,him/2,him])

            var gg = svg.append("g")
                .attr("class","rects")
                .attr("transform", "translate("+imagemargin.left+","+imagemargin.top+")")
            var g_cb = svg.append("g")
                .attr("class","cb")
                .attr("transform", "translate("+(wim+imagemargin.left)+","+imagemargin.top+")")

            var rects_cb = g_cb.selectAll("rect")
                                .data(d3.range(him+1))
                                .enter()
                                .append("rect")
                                .attr("width",15)
                                .attr("height","1")
                                .attr("x",15)
                                .attr("y", function(d,i){return i})
                                .attr("fill", function(d){return imcolorscale(h2imcolor.invert(d))})

            g_cb.append("g")
                .attr("class","colorscale")
                .attr("transform","translate(30,0)")
                .call(d3.axisRight(h2imcolor).tickFormat(d3.format(".3s")))

            var ximage = d3.scaleLinear()
                            .domain([x_index(viewPort3D,0),x_index(viewPort3D,n.SizeX)])
                            .range([0,wim])
            var yimage = d3.scaleLinear()
                            .domain([y_index(viewPort3D,0),y_index(viewPort3D,n.SizeY)])
                            .range([0,him])
            var zoom_image=d3.zoom()
                                .scaleExtent([1, 20])
                                .translateExtent([[0, 0], [wim, him]])
                                .extent([[0, 0], [wim, him]])
                                .on("zoom", zoomed_image);
            gg.call(zoom_image)
            gg.on("dblclick.zoom",null)
            gg.on("mousedown.zoom",null)

            function zoomed_image(){
                t = d3.event.transform
                xtimage=t.rescaleX(ximage)
                ytimage=t.rescaleY(yimage)
                gg.selectAll("rect.irect")
                    .attr("x",function(d,i){return xtimage(x_index(viewPort3D,Math.floor(i/n.SizeY)))})
                    .attr("y",function(d,i){return ytimage(y_index(viewPort3D,i%n.SizeY))})
                    .attr("width",1+Math.abs(xtimage( x_index(viewPort3D,0) )-xtimage(x_index(viewPort3D,1))))
                    .attr("height",1+Math.abs(ytimage(y_index(viewPort3D,0))-ytimage(y_index(viewPort3D,1))))
                gX_image.call(xAxis_image.scale(xtimage))
                gY_image.call(yAxis_image.scale(ytimage))
                update_navtrias()


            }


            xAxis_image = d3.axisBottom(ximage)
                .ticks(wim/50)
            yAxis_image = d3.axisLeft(yimage)
                .tickFormat(d3.format(".3"))
                .ticks(him/35)
            var gX_image = gg.append("g")
                .attr("class","xAxis")
                .attr("transform","translate(0,"+him+")")
                .call(xAxis_image)
            var gY_image = gg.append("g")
                .attr("class","yAxsis")
                .attr("transform","translate(0,0)")
                .call(yAxis_image)

            svg.append("text")
                .attr("class","header")
                .attr("font-size",fs)
                .attr("transform","translate("+(wi-imagemargin.right)+","+(fs)+")")
                .text("Sum")
                .on("click",change_iinfo)

            gg.append("text")
                .attr("class","xlabel")
                .attr("font-size",fs)
                .attr("transform","translate("+(-imagemargin.left+fs/2)+","+(-fs/2)+")")
                .text("Y ["+standardunit+"]")
            gg.append("text")
                .attr("class","xlabel")
                .attr("font-size",fs)
                .attr("text-anchor","middle")
                .attr("transform","translate("+(wim/2)+","+(him+imagemargin.bottom-fs/2)+")")
                .text("X ["+standardunit+"]")

            var rects = gg.selectAll("rect")
                .data(idata)
                .enter()
                .append("rect")
                .attr("fill", function(d,i){return imcolorscale(d)})
                .attr("x",function(d,i){return ximage(x_index(viewPort3D,Math.floor(i/n.SizeY)))})
                .attr("y",function(d,i){return yimage(y_index(viewPort3D,i%n.SizeY))})
                .attr("width",1+Math.abs(ximage( x_index(viewPort3D,0) )-ximage(x_index(viewPort3D,1))))
                .attr("height",1+Math.abs(yimage(y_index(viewPort3D,0))-yimage(y_index(viewPort3D,1))))
                .attr("class","irect")
                .attr("clip-path","url(#imageclip-"+fuis[fn].id+"-"+id+")")
                .attr("i",function(d,i){return i})
            gg.append("defs").append("clipPath")
                .attr("id","imageclip-"+fuis[fn].id+"-"+id)
                .append("rect")
                .attr("width",wim)
                .attr("height",him)
            gg.append("defs").append("clipPath")
                .attr("id","imagenavtriaclip-"+fuis[fn].id+"-"+id)
                .append("rect")
                .attr("width", wim+14)
                .attr("height",him+14)
                .attr("transform","translate("+(-7)+","+(-7)+")")
            var datapos= Math.floor(viewPort3D.ModelOrigin[0]) *n.SizeY + Math.floor( viewPort3D.ModelOrigin[1])
            var tr_dur=100
            function update_navtrias(){
                p=[ parseInt(active_rect.attr("x"))+parseInt(active_rect.attr("width"))/2,
                    parseInt(active_rect.attr("y"))+parseInt(active_rect.attr("height"))/2
                    ]

                polylist =   [  p[0]    +","+him    +" "+(p[0]+5)+","+(him+7)   +" "+(p[0]-5)+","+(him+7),
                                p[0]    +",0"       +" "+(p[0]+5)+",-7"         +" "+(p[0]-5)+",-7",
                                "0,"   +p[1]        +" -7,"+(p[1]-5)            +" -7,"+(p[1]+5),
                                wim+","+p[1]        +" "+(wim+7)+","+(p[1]-5)   +" "+(wim+7)+","+(p[1]+5)
                            ]
                triangs = gg.selectAll("polygon.navtria")
                                .data(polylist)
                triangs.transition().duration(tr_dur).attr("points",function(d,i){return d})
                triangs.enter()
                    .append("polygon")
                    .attr("fill","black")
                    .attr("points",function(d,i){return d})
                    .attr("class","navtria")
                    .attr("clip-path","url(#imagenavtriaclip-"+fuis[fn].id+"-"+id+")")

            }
            var modify_graph=false
            var active_rect
            gg.on("mouseup",function(){modify_graph=false})
            gg.selectAll("rect").each(function(d,i){
                if (parseInt(d3.select(this).attr("i"))==datapos){
                    active_rect=d3.select(this)
                }
                    d3.select(this).on("mousedown", function(){
                        d3.event.preventDefault()
                        modify_graph=true;
                        active_rect=d3.select(this)
                        draw_graph()
                    })
                    d3.select(this).on("mouseover", function(){
                        if (modify_graph) {
                            active_rect=d3.select(this)
                            draw_graph()
                        }
                    })
                    d3.select(this).on("dblclick", disenable_rect)
            })
            function resize_ig(){
                //return
                if ($("td.hiddenRow").width()==w){return}
 
                w=$("td.hiddenRow").width()
                h=$( window ).height()
    
                hg=(h-graphmargin.top-graphmargin.bottom)/3
                wg=w-graphmargin.left-graphmargin.right
    
                hi=(h-imagemargin.top-imagemargin.bottom)/3
                wi=w-imagemargin.top-imagemargin.bottom
            wi=w/3
            wim=wi-imagemargin.left-imagemargin.right
            him=(wim/n.SizeX)*n.SizeY
            s=Math.max(Math.floor(Math.min(him/n.SizeY, wim/n.SizeX)),1)
            him=s*n.SizeY
            wim=s*n.SizeX
            hi=him+imagemargin.top+imagemargin.bottom
            wi=wim+imagemargin.left+imagemargin.right
                    
                hg=hi
                wg=w-wi
                hgm=hg-graphmargin.top-graphmargin.bottom
                wgm=wg-graphmargin.left-graphmargin.right

                expsel=d3.selectAll("[aria-expanded=true]")

                d3.selectAll("svg.image2d").attr("width", wi)
                   .attr("height", hi)
                d3.selectAll("svg.graph").attr("width", wg)
                         .attr("height", hg)
        return
                d3.selectAll("g.rects")
                    .attr("transform", "translate("+imagemargin.left+","+imagemargin.top+")")
                d3.selectAll("scg.graph g.graphraw")
                        .attr("transform", "translate("+graphmargin.left+","+graphmargin.top+")")
                d3.selectAll("svg.graph g.xAxis")
                            .attr("transform","translate(0,"+String(hgm)+")")
                d3.selectAll("svg.graph text.raman_shift_label")
                            .attr("transform","translate("+(wgm/2)+","+(hgm+graphmargin.bottom-fs/2)+")")
                d3.selectAll("svg.graph text.ylabel")
                            .attr("transform","translate("+(-graphmargin.left+fs)+","+(hgm)/2+") rotate(-90)")
            }
            $(window).resize(function(){setTimeout(resize_ig,100)})
            $('div#'+fuis[fn].id+ ' tr#'+id).click(function(){setTimeout(resize_ig,300)})
            var addi_pos_now
            function brushing(){
                return;
                if (!(d3.event.selection)) {return}
                last_selection=d3.event.selection.map(x.invert, x)
                if (last_selection.length!=2){return}
                sel_low=Math.ceil(x_(last_selection[0]))
                sel_up=Math.ceil(x_(last_selection[1]))
                if (Math.abs(sel_low-sel_up)<0){return}
                for (i=sel_low;i<sel_up;i++){
                    if (marked_indez.indexOf(i)==-1){
                        if (addi_pos_now.indexOf(i)==-1){
                            addi_pos_now.push()
                        }
                    }
                }
            }
            var marked_indez=[]
            var permitted_zones=[[0,n.SizeGraph]]
            function brushed(){
                if (!(d3.event.selection)) {return}
                if (xt){last_selection = d3.event.selection.map(xt.invert, xt)}
                else {last_selection=d3.event.selection.map(x.invert, x)}
                if (last_selection.length!=2){return}
                sel_low=Math.ceil(x_(last_selection[0]))
                sel_up=Math.ceil(x_(last_selection[1]))
                if (Math.abs(sel_low-sel_up)<0){return}
                for (i=sel_low;i<sel_up+1;i++){
                    if (marked_indez.indexOf(i)==-1){
                        marked_indez.push(i)
                    }
                }
                marked_indez.sort(function(a,b){return a-b})
                permitted_zones=[]
                g_graph.selectAll("path.selected").remove()
                for (i=0;i<marked_indez.length;i++){
                    start=marked_indez[i]
                    while (Math.abs(marked_indez[i]-marked_indez[i+1])==1){i++}
                    permitted_zones.push([start,marked_indez[i]])
                }
                if (permitted_zones[0][0]==0 & permitted_zones[0][1]==n.SizeGraph) {marked_indez=[]}
                draw_graph()
                redraw_image()
            }
            function draw_graph(){
                update_navtrias()
                datapos=parseInt(active_rect.attr("i"))
                hrs=h2imcolor(idata[datapos])
                hrect_pos=["0,"+(hrs)+" 15,"+(hrs)]
                hrect=g_cb.selectAll("polygon.hrect").data(hrect_pos)
                hrect.transition()
                    .duration(tr_dur)
                    .attr("points",function(d){return d})
                hrect.enter()
                        .append("polygon")
                            .attr("points",function(d){return d})
                            .attr("class","hrect")
                            .attr("fill","none")
                            .attr("stroke","black")
                            .attr("transform","translate(15,0)")


                linedata=n.GraphData.Data.slice(datapos*n.SizeGraph,(datapos+1)*n.SizeGraph)
                if (yaxis_global){
                    y.domain([idata_min,idata_max])
                }else{
                    max=d3.min(linedata)
                    min=d3.max(linedata)
                    permitted_zones.forEach(function(el){
                        slice_now=linedata.slice(el[0],el[1]+1)
                        max_now=d3.max(slice_now)
                        min_now=d3.min(slice_now)
                        if (max_now>max) {max=max_now}
                        if (min_now<min) {min=min_now}
                    })
                    y.domain([min,max])
                }
                svg_graph.select(".yAxis")
                    .transition().duration(tr_dur)
                    .call(yAxis)
                lineFunction = d3.line()
                    .curve(d3.curveStepAfter)
                    .x(function(d,i){ if (xt){return xt(raman_shift(wl,c,i))}else{return x(raman_shift(wl,c,i))} })
                    .y(function(d,i){ return y(d) })
                lineFunction2 = d3.line()
                    .curve(d3.curveStepAfter)
                    .x(function(d){ if (xt){return xt(raman_shift(wl,c,d.i))}else{return x(raman_shift(wl,c,d.i))}})
                    .y(function(d){return y(d.d)})
                zoneLine = function(d){
                    d_arr=[]
                    for (i=d[0];i<d[1];i++){
                        obj={}
                        obj.d=linedata[i]
                        obj.i=i
                        d_arr.push(obj)
                    }
                    return lineFunction2(d_arr)
                }
                if (xt){g_graph.select(".xAxis").call(d3.axisBottom(x).scale(xt)); }
                path=svg_graph.select(".line")
                    .transition().duration(tr_dur)
                    .attr("d",lineFunction(linedata))
                    .attr("fill","none")
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)    
                selected_paths=g_graph.selectAll("path.selected")
                    .data(permitted_zones)
                selected_paths
                    .transition().duration(tr_dur)
                    .attr("d", function(d){return zoneLine(d)})
                clipid=g_graph.select("clipPath").attr("id")
                selected_paths.enter()
                    .append("path")
                        .attr("d", function(d){return zoneLine(d) })
                        .attr("fill","none")
                        .attr("stroke", "blue")
                        .attr("class","selected")
                        .attr("clip-path","url(#"+clipid+")")
                selected_paths.exit()
                                .remove()
                }
            }
            var iinfo=["Sum","Max","Min"]
            function change_iinfo(){
                sel=d3.select(this)
                ix=iinfo.indexOf(sel.text())
                if (ix+1==iinfo.length){ix_n=0}else{ix_n=ix+1}
                sel.text(iinfo[ix_n])
                draw_func_selector= {
                                        Max     :d3.max,
                                        Min     :d3.min,
                                        Sum     :d3.sum
                                    }

                draw_func=draw_func_selector[iinfo[ix_n]]
                redraw_image()

            }
            var disabled_pos=[]
            function disenable_rect(){
                dp=parseInt(d3.select(this).attr("i"))
                index_pos=disabled_pos.indexOf(dp)
                if (index_pos==-1){
                    disabled_pos.push(dp)
                    d3.select(this).attr("opacity","0")
                }else{
                    disabled_pos.splice(index_pos,1)
                    d3.select(this).attr("opacity",null)
                }
                redraw_image()
            }
            var draw_func=d3.sum
            function redraw_image(){
                idata=new Array(n.SizeX*n.SizeY)
                idata_max=d3.min(n.GraphData.Data)
                idata_min=d3.max(n.GraphData.Data)
                for (i=0;i<n.SizeX*n.SizeY;i++) {
                    if (disabled_pos.indexOf(i)==-1){
                        data_now=n.GraphData.Data.slice(i*n.SizeGraph,(i+1)*n.SizeGraph)
                        push_val=null
                        permitted_zones.forEach(function(pz){ 
                            data_now_now=data_now.slice(pz[0],pz[1])
                            push_val_temp=draw_func(data_now_now)
                            if (!push_val){push_val=push_val_temp}
                            else{push_val=draw_func([push_val,push_val_temp])}
                            max_now=d3.max(data_now_now)
                            min_now=d3.min(data_now_now)
                            if (idata_max<max_now){idata_max=max_now}
                            if (idata_min>min_now){idata_min=min_now}
                        })
                        idata[i]=push_val
                    }else{
                        idata[i]=null
                    }
                }
                imcolorscale.domain([d3.max(idata),d3.min(idata)/2+d3.max(idata)/2,d3.min(idata)])
                h2imcolor.domain([d3.max(idata),d3.min(idata)/2+d3.max(idata)/2,d3.min(idata)])
                g_cb.select("g.colorscale")
                    .transition()
                    .duration(tr_dur)
                    .call(d3.axisRight(h2imcolor)
                        .tickFormat(d3.format(".3s")))
                gg.selectAll("rect.irect")
                    .data(idata)
                    .attr("fill",function(d){return imcolorscale(d)})
                g_cb.selectAll("rect")
                    .data(d3.range(him+1))
                    .attr("fill",function(d){return imcolorscale(h2imcolor.invert(d)) })
                draw_graph()
            }
            var yaxis_global=false;
            function yaxis_global_change(){
                ylabel=svg_graph.select("text.ylabel")
                if (yaxis_global){
                    yaxis_global=false
                    ylabel.text("CCD cts.")

                }else{
                    yaxis_global=true;
                    ylabel.text("CCD cts. (fixed)")
                    //y.domain([d3.min(n.GraphData.Data),d3.max(linedata)])
                }
                draw_graph()
            }
            draw_graph()
        }
}
function graph_found(a) {
    for (fn in a) {
        var tr = document.createElement("tr");
        tr.setAttribute("class","row_empty");
        var td = document.createElement("td");
        td.setAttribute("colspan","7");

        tr.appendChild(td);
        $('#'+fuis[fn].id+" #emptyrows").append(tr);
    }
}
 function graph_info(c) {
    for (fn in c) {
        for (id in c[fn]) {
            fuis[fn]["TDGraph"][id]=c[fn][id]
            w=c[fn][id]
            $('#'+fuis[fn].id+" #"+id+" .xentries").text(w["SizeX"])
            $('#'+fuis[fn].id+" #"+id+" .yentries").text(w["SizeY"])
            $('#'+fuis[fn].id+" #"+id+" .rentries").text(w["SizeGraph"])
            $('#'+fuis[fn].id+" #"+id+" .pixelsize").attr("id",c[fn][id].SpaceTransformationID)
        }
    }
 }
 function graph_identified(r) {
    for (fn in r) {
        var tbody=$('#'+fuis[fn].id+" #fullrows")
        for (id in r[fn]) {
            fuis[fn].TDGraph={}
            fuis[fn].TDGraph[id]={}
            fuis[fn].TDGraph[id].Caption=r[fn][id].Caption
            $('#'+fuis[fn].id+" #emptyrows tr:first").remove();

            var tr_body = document.createElement("tr");
            tr_body.setAttribute("id",id);
            tr_body.setAttribute("class","row_full");

            var th0 = document.createElement("th");
            th0.setAttribute("class","Caption");
            th0.innerHTML=r[fn][id].Caption;
            var th1 = document.createElement("td");
            th1.setAttribute("class","pixelsize")
            var th2 = document.createElement("td");
            th2.setAttribute("class","xentries");
            var th3 = document.createElement("td");
            th3.setAttribute("class","yentries");
            var th4 = document.createElement("td");
            th4.setAttribute("class","rmin");
            var th5 = document.createElement("td");
            th5.setAttribute("class","rmax");
            var th6 = document.createElement("td");
            th6.setAttribute("class","rentries");

            tr_body.appendChild(th0);
            tr_body.appendChild(th1);
            tr_body.appendChild(th2);
            tr_body.appendChild(th3);
            tr_body.appendChild(th4);
            tr_body.appendChild(th5);
            tr_body.appendChild(th6);

            tbody.append(tr_body)
        }
    }
 }
 function create_tables(files, fe) {
     for (var i=0;i<files.length;i++) {
         var name = files[i].name;
         fuis[name]={};
         fuis[name]["id"]=i;
         var j = document.createElement("div");
         j.setAttribute("id",i);
         j.setAttribute("class","jumbotron");
        
         var responsive_table = document.createElement("div");
         responsive_table.setAttribute("class","table-responsive");

         var table = document.createElement("table");
         table.setAttribute("class","table");
         
         var caption = document.createElement("caption");
         caption.appendChild(document.createTextNode(name+" "));
         var captionspinner = document.createElement("i");
         captionspinner.setAttribute("class","fa fa-circle-o-notch fa-spin");
         caption.appendChild(captionspinner);

         var thead = document.createElement("thead");
         var tbody = document.createElement("tbody");
         var tbody_empty = document.createElement("tbody");
         tbody.setAttribute("id","fullrows");
         tbody_empty.setAttribute("id","emptyrows");

         var tr_head = document.createElement("tr");
         
         var th0 = document.createElement("th");
         th0.appendChild(document.createTextNode("Caption"));
         var th1 = document.createElement("th");
         th1.appendChild(document.createTextNode("Pixel Size"));
         var th2 = document.createElement("th");
         th2.appendChild(document.createTextNode("X Entries"));
         var th3 = document.createElement("th");
         th3.appendChild(document.createTextNode("Y Entries"));
         var th4 = document.createElement("th");
         th4.appendChild(document.createTextNode("Raman Shift Minimum"));
         var th5 = document.createElement("th");
         th5.appendChild(document.createTextNode("Raman Shift Maximum"));
         var th6 = document.createElement("th");
         th6.appendChild(document.createTextNode("Raman Shift Entries"));

         tr_head.appendChild(th0);
         tr_head.appendChild(th1);
         tr_head.appendChild(th2);
         tr_head.appendChild(th3);
         tr_head.appendChild(th4);
         tr_head.appendChild(th5);
         tr_head.appendChild(th6);
         thead.appendChild(tr_head);
         table.appendChild(caption);
         table.appendChild(thead);
         table.appendChild(tbody);
         table.appendChild(tbody_empty);
         responsive_table.appendChild(table);
         j.appendChild(responsive_table);
         fe.appendChild(j);
     }
 }
