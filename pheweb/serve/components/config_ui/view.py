import json
from flask import Blueprint, current_app as app, g, request

config_ui = Blueprint('config_ui', __name__)

@config_ui.route('/api/config/ui', methods=["GET"])
def get_config_ui():
    app_dao = app.jeeves.config_ui
    return json.dumps(app_dao.get_config())
