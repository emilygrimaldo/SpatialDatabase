from flask import Flask, jsonify
from flask_cors import CORS
from riskheatmap import generate_heatmap

app = Flask(__name__)
CORS(app)

@app.route('/api/heatmap')
def heatmap():
    heatmap_data = generate_heatmap()
    return jsonify(heatmap_data)

if __name__ == '__main__':
    app.run(debug=True)