import urllib.request
import json
import csv
import io
import os

def generate_real_stars_and_lines():
    # 1. First we need an ACTUAL real bright star catalog. 
    # Our fallback synthetic one won't work for constellations since random coordinates don't form real shapes.
    
    # Let's use the Yale Bright Star Catalog (public domain, commonly hosted format)
    # Actually, the d3-celestial project has open source parsed constellation line arrays and star data
    url_stars = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/stars.6.json"
    url_lines = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json"
    
    # We will fetch stars limit to mag < 4 to keep it lightweight, but we MUST keep 
    # any star that is referenced by a constellation line so the lines don't break.
    
    print("Downloading authentic constellation lines...")
    req_lines = urllib.request.Request(url_lines, headers={'User-Agent': 'Mozilla/5.0'})
    resp_lines = urllib.request.urlopen(req_lines)
    lines_geo = json.loads(resp_lines.read().decode('utf-8'))
    
    # The lines are typically GeoJSON with MultiLineStrings using [RA (degrees), Dec (degrees)]
    # RA in geojson is usually [-180, 180] or [0, 360] representing 0-24h
    
    # To draw lines in ThreeJS independently of finding exact star points (which is hard if we filter stars)
    # we can just export the raw coordinate pairs for the lines!
    
    final_lines = []
    
    for feature in lines_geo.get('features', []):
        geometry = feature.get('geometry', {})
        if geometry.get('type') == 'MultiLineString':
            # Geometry coordinates are arrays of line segments, each segment is an array of [ra, dec] points
            segments = geometry.get('coordinates', [])
            for segment in segments:
                line_points = []
                for pt in segment:
                    # GeoJSON pt is usually [lon, lat] which is [RA in deg, Dec in deg]
                    # We need RA in hours for our astronomy-engine math: RA_hours = RA_deg / 15
                    # Wait, d3-celestial uses [lon, lat], where lon is -180 to 180.
                    # lon = 0 is RA 0. lon = -90 is RA 18h. lon = 90 is RA 6h. 
                    # Actually standard maps: RA = (lon < 0 ? lon + 360 : lon) / 15
                    lon = pt[0]
                    lat = pt[1]
                    ra = (lon if lon >= 0 else lon + 360) / 15.0
                    dec = lat
                    line_points.append([ra, dec])
                final_lines.append(line_points)
                

    print("Downloading authentic star catalog...")
    req_stars = urllib.request.Request(url_stars, headers={'User-Agent': 'Mozilla/5.0'})
    resp_stars = urllib.request.urlopen(req_stars)
    stars_geo = json.loads(resp_stars.read().decode('utf-8'))
    
    final_stars = []
    star_id = 0
    for feature in stars_geo.get('features', []):
        coords = feature.get('geometry', {}).get('coordinates', [0,0])
        props = feature.get('properties', {})
        mag = props.get('mag', 10)
        
        # Filter for moderately bright stars
        if mag <= 4.5:
            lon = coords[0]
            lat = coords[1]
            ra = (lon if lon >= 0 else lon + 360) / 15.0
            dec = lat
            
            final_stars.append({
                "id": star_id,
                "ra": ra,
                "dec": dec,
                "mag": mag
            })
            star_id += 1

    print(f"Extracted {len(final_stars)} real stars and {len(final_lines)} constellation line segments.")
    
    # Save stars
    stars_path = "c:/Users/perse/OneDrive/Documentos/1. PROYECTOS/Watchclock/src/data/stars.json"
    os.makedirs(os.path.dirname(stars_path), exist_ok=True)
    with open(stars_path, "w") as f:
        json.dump(final_stars, f)

    # Save lines
    lines_path = "c:/Users/perse/OneDrive/Documentos/1. PROYECTOS/Watchclock/src/data/constellations.json"
    with open(lines_path, "w") as f:
        json.dump(final_lines, f)
        
    print("Done generating authentic sky datasets.")

if __name__ == "__main__":
    generate_real_stars_and_lines()
