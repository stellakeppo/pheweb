import React from 'react'
import { Link } from 'react-router-dom'
import ReactTable from 'react-table'
import { CSVLink } from 'react-csv'
import { phenolistTableCols , phenoColumn , constructColumn , constructHeaders } from '../tables.js'

class Index extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
	    phenolistColumns: window.browser in phenolistTableCols?phenolistTableCols[window.browser]:null,
	    filtered: [],
	    dataToDownload: [],
	}
	this.download = this.download.bind(this)
	this.getPhenos = this.getPhenos.bind(this)
	this.getConfig = this.getConfig.bind(this)
	this.getConfig()
	this.getPhenos()
    }
    
    getConfig() {
	fetch('/api/config/ui')
	    .then( response => response && response.json())
	    .then( response => {
		if(response && "index" in response){
		    const config = response["index"];
		    console.log(config);
		    if("phenolist" in config){
			var phenolistColumns = config["phenolist"];
			phenolistColumns = phenolistColumns.map(constructColumn);
			this.setState({ phenolistColumns });
		    }
		}
	    })
	    .then(_ => { (this.state && this.state.phenolistColumns) || alert('no table columns for ' + window.browser); });
    };
    
    getPhenos() {
	fetch('/api/phenos')
	    .then(response => {
		if (!response.ok) throw response
		return response.json()
	    })
	    .then(response => {
		response.forEach(pheno => {
		    pheno.lambda = pheno.gc_lambda['0.5']
		})
		this.setState({
		    phenos: response
		})
	    })
	    .catch(error => {
		alert(`${error.statusText || error}`)
	    })
		}

    download() {
	this.setState({
	    dataToDownload: this.reactTable.getResolvedState().sortedData
	}, () => {
	    this.csvLink.link.click()
	})
    }

    render() {

	if (!this.state.phenos || this.state.phenolistColumns == null) {
	    return <div>loading</div>
	}

	const phenoTable =
	      <div>
	      <h3>Phenotype list</h3>
	    <ReactTable
	    ref={(r) => this.reactTable = r}
	data={this.state.phenos}
	filterable
	defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().includes(filter.value.toLowerCase())}
	columns={this.state.phenolistColumns}
	defaultSorted={[{
	    id: "num_gw_significant",
	    desc: true
	}]}
	defaultPageSize={20}
	className="-striped -highlight"
	    />
	    <div className="row">
	    <div className="col-xs-12">
	    <div className="btn btn-primary" onClick={this.download}>Download {this.state.filtered.filter(f => !(f.id == 'variant_category' && f.value == 'all') && !(f.id == 'variant' && f.value == 'all')).length > 0 ? 'filtered' : ''} table</div>
	    </div>
	    </div>
            <CSVLink
	headers={constructHeaders(this.state.phenolistColumns)}
	data={this.state.dataToDownload}
	separator={'\t'}
	enclosingCharacter={''}
	filename="finngen_endpoints.tsv"
	className="hidden"
	ref={(r) => this.csvLink = r}
	target="_blank" />
	    </div>
	
        return (
		<div style={{width: '100%', padding: '0'}}>
		{phenoTable}
		</div>
        )
    }
}

export default Index
