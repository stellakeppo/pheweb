import json
from flask import Blueprint, current_app as app, g, request, jsonify
from .tries_dao import create_autocompleter as tries_dao_create_autocompleter
from .sqlite_dao import create_autocompleter as sqlite_dao_create_autocompleter

def createAutocompleter(phenos):
    """
    Attempt to construct autocomplete
    """
    result = None
    if not result is None:
        result = tries_dao_create_autocompleter(phenos)
    if not result is None:
        result = sqlite_dao_create_autocompleter(phenos)
    return result
    

autocomplete = Blueprint('autocomplete', __name__)

@autocomplete.route('/api/autocomplete', methods=["GET"])
def get_autocomplete():
    if not hasattr(autocomplete, 'autocompleter'):
        autocomplete.autocompleter = createAutocompleter(app.use_phenos)
        assert not autocomplete.autocompleter is None, "could not configure auto complete"
    query = request.args.get('query', '')
    suggestions = autocomplete.autocompleter.autocomplete(query)
    if suggestions:
        return jsonify(sorted(suggestions, key=lambda sugg: sugg['display']))
    return jsonify([])
