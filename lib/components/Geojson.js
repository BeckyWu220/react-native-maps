import React from 'react';
import MapView from './MapView';

export const makeOverlays = features => {
  const points = features
    .filter(
      f =>
        f.geometry &&
        (f.geometry.type === 'Point' || f.geometry.type === 'MultiPoint')
    )
    .map(feature =>
      makeCoordinates(feature).map(coordinates =>
        makeOverlay(coordinates, feature)
      )
    )
    .reduce(flatten, [])
    .map(overlay => ({ ...overlay, type: 'point' }));

  const lines = features
    .filter(
      f =>
        f.geometry &&
        (f.geometry.type === 'LineString' ||
          f.geometry.type === 'MultiLineString')
    )
    .map(feature =>
      makeCoordinates(feature).map(coordinates =>
        makeOverlay(coordinates, feature)
      )
    )
    .reduce(flatten, [])
    .map(overlay => ({ ...overlay, type: 'polyline' }));

  const multipolygons = features
    .filter(f => f.geometry && f.geometry.type === 'MultiPolygon')
    .map(feature =>
      makeCoordinates(feature).map(coordinates =>
        makeOverlay(coordinates, feature)
      )
    )
    .reduce(flatten, []);

  const polygons = features
    .filter(f => f.geometry && f.geometry.type === 'Polygon')
    .map(feature => makeOverlay(makeCoordinates(feature), feature))
    .reduce(flatten, [])
    .concat(multipolygons)
    .map(overlay => ({ ...overlay, type: 'polygon' }));

  return points.concat(lines).concat(polygons);
};

const flatten = (prev, curr) => prev.concat(curr);

const makeOverlay = (coordinates, feature) => {
  let overlay = {
    feature,
  };
  if (
    feature.geometry.type === 'Polygon' ||
    feature.geometry.type === 'MultiPolygon'
  ) {
    overlay.coordinates = coordinates[0];
    if (coordinates.length > 1) {
      overlay.holes = coordinates.slice(1);
    }
  } else {
    overlay.coordinates = coordinates;
  }
  return overlay;
};

const makePoint = c => ({ latitude: c[1], longitude: c[0] });

const makeLine = l => l.map(makePoint);

const makeCoordinates = feature => {
  const g = feature.geometry;
  if (g.type === 'Point') {
    return [makePoint(g.coordinates)];
  } else if (g.type === 'MultiPoint') {
    return g.coordinates.map(makePoint);
  } else if (g.type === 'LineString') {
    return [makeLine(g.coordinates)];
  } else if (g.type === 'MultiLineString') {
    return g.coordinates.map(makeLine);
  } else if (g.type === 'Polygon') {
    return g.coordinates.map(makeLine);
  } else if (g.type === 'MultiPolygon') {
    return g.coordinates.map(p => p.map(makeLine));
  } else {
    return [];
  }
};

const Geojson = props => {
  const overlays = makeOverlays(props.geojson.features);
  let overlayRefs = [];

  const [ selectedIndex, setSelectedIndex ] = React.useState(null)

  return (
    <React.Fragment>
      {overlays.map((overlay, index) => {
        if (overlay.type === 'point') {
          return (
            <MapView.Marker
              key={index}
              coordinate={overlay.coordinates}
              pinColor={props.color}
            />
          );
        }
        if (overlay.type === 'polygon') {
          // If styles are specified in .json file, apply them. Otherwise, use the default style for geoJson component.
          const { properties: { tappable = false, fillColor, strokeColor, strokeWidth, highlightedFillColor = fillColor, highlightedStrokeColor = fillColor, highlightedStrokeWidth = strokeWidth, onPress = () => {} } } = overlay.feature
          return (
            <MapView.Polygon
              ref={ref => { overlayRefs.push(ref) }}
              key={index}
              coordinates={overlay.coordinates}
              holes={overlay.holes}
              strokeColor={strokeColor || props.strokeColor}
              fillColor={fillColor || props.fillColor}
              strokeWidth={strokeWidth ? Number(strokeWidth) :props.strokeWidth}
              tappable={tappable}
              onPress={() => {
                if (selectedIndex !== null) {
                  // Set last selected polygon to un-highlighted status with default fillColor and stroke.
                  const { properties: { fillColor, highlightedFillColor = fillColor }  } = overlays[selectedIndex].feature
                  if (fillColor && highlightedFillColor !== fillColor) {
                    overlayRefs[selectedIndex].setNativeProps({ fillColor, strokeColor: props.strokeColor, strokeWidth: props.strokeWidth })
                  }
                }
                if (selectedIndex === null || index !== selectedIndex) {
                  setSelectedIndex(index)
                  if (fillColor && highlightedFillColor !== fillColor) {
                    // Set new selected polygon to highlighted status with highlightedFillColor and stoke.
                    overlayRefs[index].setNativeProps({ fillColor: highlightedFillColor, strokeColor: highlightedStrokeColor, strokeWidth: highlightedStrokeWidth })
                    onPress(overlays[index].feature.properties)
                  }
                }
                if (selectedIndex !== null && index === selectedIndex) {
                  // Tap the current selected polygon to cancel current selection.
                  setSelectedIndex(null)
                  onPress(null)
                }
                
              }}
            />
          );
        }
        if (overlay.type === 'polyline') {
          return (
            <MapView.Polyline
              key={index}
              coordinates={overlay.coordinates}
              strokeColor={props.strokeColor}
              strokeWidth={props.strokeWidth}
            />
          );
        }
      })}
    </React.Fragment>
  );
};

export default Geojson;
