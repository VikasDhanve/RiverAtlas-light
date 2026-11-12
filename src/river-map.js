/* Local WGS84 vectors; no network tiles, inferred registration boundaries or water simulation. */
const RiverAtlasMap=(()=>{
  'use strict';
  function create(container,{onSelect,attributes,rivers}){
    let map=null,selected=null,paused=false,staticMode=false,destroyed=false;
    const groups=[],labels=[],annotations=[],data=RiverAtlasGeography;
    const allBounds=L.geoJSON(data.rivers).getBounds();
    const text=(value,className)=>{const n=document.createElement('span');n.className=className;n.textContent=value;return n;};
    function paint(){
      container.classList.toggle('map-frozen',paused);container.classList.toggle('map-static',staticMode);
      groups.forEach((group,index)=>{
        const dim=selected!==null&&selected!==index;
        group.eachLayer(collection=>collection.eachLayer(layer=>layer.getElement()?.classList.toggle('river-dimmed',dim)));
      });
      labels.forEach((label,index)=>label.getElement()?.classList.toggle('river-label-dimmed',selected!==null&&selected!==index));
      layoutLabels();
      container.setAttribute('aria-label',selected===null?'五河地理地图':data.rivers.features[selected].properties.name+'地理地图');
    }
    function layoutLabels(){
      if(!map)return;
      const small=container.clientWidth<520,compact=selected===null;
      container.dataset.selection=selected===null?'all':String(selected);container.classList.toggle('map-compact-labels',compact);
      const width=compact?100:small?228:220,height=compact?30:132;
      const slots=[[.5,.88],[.02,.88],[.04,.02],[.50,.02],[.98,.47]];
      annotations.forEach((a,i)=>{
        if(compact){const point=map.latLngToContainerPoint(a.anchor).add([8,-12]);a.marker.setLatLng(map.containerPointToLatLng(point));a.connector.setStyle({opacity:0});return;}
        const slot=selected===null?slots[i]:[0,0],x=12+slot[0]*Math.max(0,container.clientWidth-width-24),y=12+slot[1]*Math.max(0,container.clientHeight-height-68);
        a.marker.setLatLng(map.containerPointToLatLng([x,y]));
        a.connector.setLatLngs([a.anchor,map.containerPointToLatLng([x+width/2,y+height/2])]);
        a.connector.setStyle({opacity:selected===null||selected===i ? .45 : 0});
      });
    }
    function fit(animate){
      if(!map)return;
      const bounds=selected===null?allBounds:L.geoJSON(data.rivers.features[selected]).getBounds();
      const options={padding:container.clientWidth<520?[30,30]:[70,65],maxZoom:12,animate:animate&&!paused&&!staticMode,duration:.85};
      map.stop();if(options.animate)map.flyToBounds(bounds,options);else map.fitBounds(bounds,options);
    }
    function select(index,animate=true){
      if(index!==null&&(!Number.isInteger(index)||index<0||index>=5))return;
      selected=index;paint();onSelect(index);fit(animate);
    }
    function init(){
      if(map||destroyed||!container.isConnected)return;
      map=L.map(container,{zoomControl:false,attributionControl:true,zoomSnap:.25,zoomDelta:.5,minZoom:8,maxZoom:12.5,
        maxBounds:[[38.8,121],[40.5,123.7]],maxBoundsViscosity:1,inertia:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});
      map.fitBounds(allBounds,{padding:[36,30],animate:false});
      L.control.zoom({position:'topright',zoomInTitle:'放大地图',zoomOutTitle:'缩小地图'}).addTo(map);
      map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
      map.attributionControl.addAttribution('<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors · ODbL</a> · <a href="https://www.naturalearthdata.com" target="_blank" rel="noopener noreferrer">Natural Earth</a>');
      L.control.scale({imperial:false,position:'bottomleft',maxWidth:120}).addTo(map);
      L.geoJSON(data.land,{interactive:false,style:{color:'#89a4af',weight:1.1,fillColor:'#edf2e9',fillOpacity:1}}).addTo(map);
      L.geoJSON(data.regions,{interactive:false,style:{color:'#7b929f',weight:1,dashArray:'4 7',fillOpacity:0,opacity:.5}}).addTo(map);
      L.geoJSON(data.water,{interactive:false,style:{color:'#73a0b7',weight:1,fillColor:'#d9edf5',fillOpacity:1}}).addTo(map);
      for(const region of data.labels){
        L.marker(region.position,{interactive:false,keyboard:false,icon:L.divIcon({html:text(region.name,'map-place-text'),className:'map-place',iconSize:[120,24],iconAnchor:[60,12]})}).addTo(map);
      }
      data.rivers.features.forEach((feature,index)=>{
        const group=L.featureGroup().addTo(map);groups.push(group);
        for(const options of [
          {className:'river-bank',color:'#075eaa',weight:13,opacity:.13,interactive:false},
          {className:'river-channel',color:'#096bc1',weight:5,opacity:.92,interactive:true},
          {className:'river-flow',color:'#003d7c',weight:2.6,opacity:.95,dashArray:'8 23',interactive:false}
        ]){
          L.geoJSON(feature,{style:{lineCap:'round',lineJoin:'round',...options},interactive:options.interactive,
            onEachFeature:(_,layer)=>layer.on('click',()=>select(index))}).addTo(group);
        }
        group.eachLayer(collection=>collection.eachLayer(layer=>{const path=layer.getElement();if(path)path.dataset.river=String(index);}));
        const line=feature.geometry.coordinates.reduce((a,b)=>a.length>b.length?a:b);
        const point=line[Math.floor(line.length*.55)];
        const anchor=L.latLng(point[1],point[0]),card=document.createElement('div');card.className='river-map-annotation';card.dataset.river=String(index);
        card.append(text(feature.properties.name,'map-river-text'));
        const details=document.createElement('dl');details.className='map-attribute-values';
        const [,length,area,county]=attributes[index];
        for(const [key,value] of [['长度',length+' km'],['面积',area+' 公顷'],['涉及县区',county]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;details.append(dt,dd);}
        card.append(details);
        const connector=L.polyline([anchor,anchor],{interactive:false,color:'#487d92',weight:1,opacity:.45}).addTo(map);
        L.circleMarker(anchor,{interactive:false,radius:3,color:'#006d7a',weight:1,fillOpacity:1}).addTo(map);
        const label=L.marker(anchor,{interactive:false,keyboard:false,zIndexOffset:600,icon:L.divIcon({html:card,className:'map-attribute-marker',iconSize:[220,132],iconAnchor:[0,0]})}).addTo(map);
        labels.push(label);annotations.push({marker:label,connector,anchor});
      });
      map.on('move zoom resize',layoutLabels);
      select(selected,false);
    }
    function setState(next){paused=next.paused;staticMode=next.staticMode;if(paused||staticMode)map?.stop();paint();}
    return {
      select,setState,
      refit(){init();map?.invalidateSize({pan:false,animate:false});layoutLabels();},
      pause(){paused=true;map?.stop();paint();},
      resume(){paused=false;paint();},
      finish(){map?.stop();},
      destroy(){destroyed=true;map?.remove();map=null;}
    };
  }
  return {create};
})();
