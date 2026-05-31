import os
import logging
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()


def create_app():
    static_dir = os.getenv('STATIC_DIR') or os.path.join(os.path.dirname(__file__), 'static')
    app = Flask(__name__, static_folder=None)
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

    CORS(app, origins=[
        os.getenv('FRONTEND_URL', 'http://localhost:5173'),
        'http://localhost:5173',
        'http://localhost:3000',
    ], supports_credentials=True, allow_headers=['Content-Type', 'Authorization'])

    logging.basicConfig(level=logging.INFO)

    from routes.auth_routes import auth_bp
    from routes.stripe_routes import stripe_bp
    from routes.ai_routes import ai_bp
    from routes.pdf_routes import pdf_bp
    from routes.api_routes import api_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(stripe_bp, url_prefix='/api/stripe')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(pdf_bp, url_prefix='/api/pdf')
    app.register_blueprint(api_bp, url_prefix='/api')

    @app.route('/api', methods=['GET'])
    @app.route('/api/health', methods=['GET'])
    @app.route('/api/healthz', methods=['GET'])
    @app.route('/health', methods=['GET'])
    @app.route('/healthz', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'service': 'greencardprep-api'})

    if static_dir:
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_frontend(path):
            if path.startswith('api/'):
                return jsonify({'error': 'Not found'}), 404
            requested_path = os.path.join(static_dir, path)
            if path and os.path.exists(requested_path) and os.path.isfile(requested_path):
                return send_from_directory(static_dir, path)
            return send_from_directory(static_dir, 'index.html')

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', '5000'))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
