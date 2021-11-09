import React from 'react'
import { Link } from 'react-router-dom'
import ReactTable from 'react-table'
import { CSVLink } from 'react-csv'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'
import { phenoTableCols, csTableCols, csInsideTableCols , pval_sentinel , constructColumn } from '../tables.js'
import { create_gwas_plot, create_qq_plot } from '../pheno.js'
import * as Handlebars from 'handlebars';


class Pheno extends React.Component {


    constructor(props) {

        super(props)
        this.state = {
	    phenocode: props.match.params.pheno,
	    columns : window.browser in phenoTableCols ? phenoTableCols[window.browser] : null,
	    csColumns : csTableCols,
	    InsideColumns : csInsideTableCols,
	    
	    dataToDownload: [],
	    locus_groups: {},
	    selectedTab: 0,
	    summary : null
	}
	
	this.resp_json = this.resp_json.bind(this)
	this.error_state = this.error_state.bind(this)
	this.error_alert = this.error_alert.bind(this)
	this.getUKBBN = this.getUKBBN.bind(this)
	this.getPheno = this.getPheno.bind(this)
	this.getCredibleSets = this.getCredibleSets.bind(this)
	this.getManhattan = this.getManhattan.bind(this)
	this.getQQ = this.getQQ.bind(this)
	this.download = this.download.bind(this)
	this.getGroup = this.getGroup.bind(this)
	this.onTabSelect = this.onTabSelect.bind(this)
	this.getConfig = this.getConfig.bind(this)
	this.getConfig()
	this.getUKBBN(props.match.params.pheno)
	this.getPheno(props.match.params.pheno)
	
    }

    
    resp_json(response) {
        if (!response.ok) throw response
	return response.json()
    }

    error_state(error) {
	this.setState({
	    error: error
	})
	}
    
    error_alert(error) {
	console.log(error);
	alert(`${error.statusText || error}`);
    }

    getConfig(){
	fetch('/api/config/ui')
            .then( response => response && response.json())
            .then( response => {
                if(response && "pheno" in response){
                    const config = response["pheno"];
                    if("Traditional" in config){
                        var columns = config["Traditional"];
                        columns = (columns == null)?[]:columns.map(constructColumn);
                        this.setState({ columns });
                    }
		    if("Credible Sets" in config){
			var csColumns = config["Credible Sets"];
                        csColumns = (csColumns == null)?[]:csColumns.map(constructColumn);
			this.setState({ csColumns });
		    }
		    if("Summary" in config){
			var summary = config["Summary"];
			this.setState({ summary });
		    }
                }
            })
            .then(_ => { (this.state && this.state.columns) || alert('no table columns for ' + window.browser); });
    }
    
    getUKBBN(phenocode) {
	fetch('/api/ukbb_n/' + phenocode)
	    .then(this.resp_json)
	    .then(response => {
		this.setState({
		    ukbb_n: response
		})
	    })
	    .catch(this.error_state)
    }
    
    getPheno(phenocode) {
	fetch('/api/pheno/' + phenocode)
	    .then(this.resp_json)
	    .then(response => {
		this.setState({
		    pheno: response
		})
		this.getCredibleSets(phenocode)
		this.getManhattan(phenocode)
		this.getQQ(phenocode)
	    })
	    .catch(this.error_state)
	}
	
	getGroup(phenocode,locus_id) {
	fetch('/api/autoreport_variants/'+phenocode+'/'+locus_id)
		.then(this.resp_json)
		.then(response => {response?
			this.setState({
				locus_groups: {
					...this.state.locus_groups,
					[locus_id]:response
				}
			}):
			0
		})
		.catch(this.error_alert)
	}

    getCredibleSets(phenocode) {
	fetch('/api/autoreport/' + phenocode)
	    .then(this.resp_json)
	    .then(response => response ? 
		this.setState({
		    credibleSets: response,
		    selectedTab: response.length == 0 ? 1 : 0
		})
		:
		this.setState({
		    credibleSets: [],
		    selectedTab: 1
		})
		)
	    .catch(this.error_alert)
    }
    getManhattan(phenocode) {
	fetch(`/api/manhattan/pheno/${phenocode}`)
            .then(this.resp_json)
	    .then(data => {
		//TODO all variants must have annotation
		data.unbinned_variants.filter(variant => !!variant.annotation).forEach(variant => {
                    variant.most_severe = variant.annotation.most_severe ? variant.annotation.most_severe.replace(/_/g, ' ').replace(' variant', '') : ''
                    variant.info = variant.annotation.INFO
		})
		data.unbinned_variants.forEach(variant => { if (variant.pval == 0) variant.pval = pval_sentinel })
		//TODO server side
		data.unbinned_variants.forEach(variant => {
		    // TODO naming af maf quickly
		    if (variant.af_alt !== undefined && variant.maf === undefined) {
			variant.maf = variant.af_alt
			variant.maf_cases = variant.af_alt_cases
			variant.maf_controls = variant.af_alt_controls
			delete variant.af_alt
			delete variant.af_alt_cases
			delete variant.af_alt_controls
		    }
		    variant.phenocode = phenocode
		    if (!variant.gnomad) {
			variant.fin_enrichment = -1
		    } else if (variant.gnomad.AF_fin === 0) {
			variant.fin_enrichment = 0
		    } else if (+variant.gnomad['AC_nfe_nwe'] + +variant.gnomad['AC_nfe_onf'] + +variant.gnomad['AC_nfe_seu'] == 0) {
			variant.fin_enrichment = 1e6
		    } else {
			variant.fin_enrichment = +variant.gnomad['AC_fin'] / +variant.gnomad['AN_fin'] /
			    ( (+variant.gnomad['AC_nfe_nwe'] + +variant.gnomad['AC_nfe_onf'] + +variant.gnomad['AC_nfe_seu']) / (+variant.gnomad['AN_nfe_nwe'] + +variant.gnomad['AN_nfe_onf'] + +variant.gnomad['AN_nfe_seu']) )
		    }
		})
		this.setState({data: data})
		create_gwas_plot(phenocode, data.variant_bins, data.unbinned_variants);
            })
	    .catch(this.error_alert)
    }

    getQQ(phenocode) {
	fetch(`/api/qq/pheno/${phenocode}`)
            .then(this.resp_json)
	    .then(data => {
		this.setState({qq: data})
		if (data.by_maf)
                    create_qq_plot(data.by_maf)
		else
                    create_qq_plot([{maf_range:[0,1],qq:data.overall.qq, count:data.overall.count}])
            })
	    .catch(this.error_alert)
	}
	
    download() {
	const table = (this.state.selectedTab == 0 ? (this.cstable|| this.vartable): (this.vartable || this.cstable)); 
	const data = table.getResolvedState().sortedData.map(datum => Object.keys(datum).reduce((acc, cur) => { if (!cur.startsWith('_')) acc[cur]=datum[cur]; return acc}, {})); 
	this.setState({
	    dataToDownload: data
	}, () => {
	    this.csvLink.link.click()
	})
    }
    
    onTabSelect(index){
	this.setState({
	    selectedTab:index
	})
    }
	
    render() {
	if (this.state.error) {
	    return <div>{this.state.error.statusText || this.state.error}</div>
	}

	if (!this.state.pheno || !this.state.columns) {
	    return <div>loading</div>
	}
	

	const pheno = this.state.pheno
	const ukbb = window.show_ukbb == 'True' ? (this.state.ukbb_n ?
						   <div>UKBB: <strong>{this.state.ukbb_n[0]}</strong> cases, <strong>{this.state.ukbb_n[1]}</strong> controls</div> :
						   <div>Phenotype not found in UKBB results</div>) : null
	const n_cc1 = pheno.cohorts ?
	      <tbody>
	        <tr>
	           <td>
	              <b>{pheno.cohorts.reduce((acc, cur) => acc+cur.num_cases, 0)}</b> cases</td></tr><tr><td><b>{pheno.cohorts.reduce((acc, cur) => acc+cur.num_controls, 0)}</b> controls
	           </td>
	        </tr>
	      </tbody> :
	      (pheno.num_cases ?
	       <tbody><tr><td><b>{pheno.num_cases}</b> cases</td></tr><tr><td><b>{pheno.num_controls}</b> controls</td></tr></tbody> :
	       pheno.num_samples ?
	       <tbody><tr><td><b>{pheno.num_samples}</b> samples</td></tr></tbody> :
 	       null)
	const n_cc2 = pheno.cohorts ?
	      <div>
	      <h3>{this.state.pheno.cohorts.length} cohorts in meta-analysis</h3>
	      <table className='column_spacing'>
<tbody>{pheno.cohorts.sort((c1, c2) => (c1.cohort.localeCompare(c2.cohort))).map(cohort => <tr key={cohort.cohort}><td>{cohort.cohort}</td><td><b>{cohort.num_cases}</b> cases</td><td><b>{cohort.num_controls}</b> controls</td></tr>)}</tbody></table></div> : null
	const cs_table = this.state.credibleSets ?
	      <div>
	      <ReactTable
	          ref={(r) => this.cstable = r}
	          data={this.state.credibleSets}
	          filterable
	          defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().includes(filter.value.toLowerCase())}
	          columns={this.state.csColumns}
	          defaultSorted={[{ id: "pval", desc: false }]}
   	          defaultPageSize={20}
	          className="-striped -highlight"
	SubComponent={row => 
		<ReactTable 
		data={this.state.locus_groups.hasOwnProperty(row["original"]["locus_id"]) ? this.state.locus_groups[row["original"]["locus_id"]] : (this.getGroup(this.state.phenocode, row["original"]["locus_id"]),this.state.locus_groups[row["original"]["locus_id"]]) }
		loading = {!this.state.locus_groups.hasOwnProperty(row["original"]["locus_id"])}
		columns={this.state.InsideColumns}
		defaultSorted={[{
			id: "cs_prob",
			desc: true
		},
		{
			id: "functional_category",
			desc: false
		},
		{
			id: "trait_name",
			desc: false
		}]}
		defaultPageSize={10}
		showPagination={true}
		showPageSizeOptions={ true}
		/> 
	}
	    />
		<div className="row">
	    <div className="col-xs-12">
	    <div className="btn btn-primary" onClick={this.download}>Download table</div>
	    </div>
	    </div>
            
	    </div> :
	<div>loading</div>
	    
	const var_table = this.state.data ?
	      <div>
	    <ReactTable
	    ref={(r) => this.vartable = r}
	data={ this.state.data.unbinned_variants.filter(v => !!v.peak)}
	filterable
	defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().includes(filter.value.toLowerCase())}
	columns={this.state.columns}
	defaultSorted={[{
	    id: "pval",
	    desc: false
	}]}
	defaultPageSize={20}
	className="-striped -highlight"
	    />
	    <div className="row">
	    <div className="col-xs-12">
	    <div className="btn btn-primary" onClick={this.download}>Download table</div>
	    </div>
	    </div>
	    </div> :
	    <div>loading</div>
	const qq_table = this.state.qq ?
	      <div>
	      <table className='column_spacing'>
	      <tbody>
	      {Object.keys(this.state.qq.overall.gc_lambda).sort().reverse().map(perc => <tr key={perc}><td>GC lambda {perc}</td><td>{this.state.qq.overall.gc_lambda[perc]}</td></tr>)}
	      </tbody>
	    </table>
	    </div> :
	<div>loading</div>

	const is_cs = this.state.credibleSets == null ?
		"" :
		this.state.credibleSets.length == 0 ? 
		"" : 
		""	

	const risteys = window.browser == 'FINNGEN' ?
	    <p style={{marginBottom: '10px'}}><a style={{fontSize:'1.25rem', padding: '.25rem .5rem', backgroundColor: '#2779bd', color: '#fff', borderRadius: '.25rem', fontWeight: 700, boxShadow: '0 0 5px rgba(0,0,0,.5)'}}
	href={'https://risteys.finngen.fi/phenocode/' + this.state.pheno.phenocode.replace('_EXALLC', '').replace('_EXMORE', '')} target="_blank">RISTEYS</a></p> : null


	const traditional = <><h4></h4>{var_table}</>;
	const credibleSet = <><h4>Credible Sets</h4>{cs_table}</>;
	const summary = this.state.summary != null && this.state.pheno != null?
	      <div dangerouslySetInnerHTML={{ __html: Handlebars.compile(this.state.summary)(this.state) }}></div>
	      :
	      <></>;
	const handlebars = this.state.summary != null && this.state.pheno != null?Handlebars.compile(this.state.summary)(this.state.pheno):null;
	console.log(handlebars);
	console.log(`summary : {this.state.summary} , pheno : {this.state.pheno} `);
	
	const csvLink = <CSVLink headers={this.state.headers}
	                 data={this.state.dataToDownload}
	                 separator={'\t'}
	                 enclosingCharacter={''}
	                 filename={this.state.selectedTab == 0 ? `${window.browser}_${window.release}_${pheno.phenocode}_autorep.tsv` : `${window.browser}_${window.release}_${pheno.phenocode}_lead.tsv`}
	                 className="hidden"
	                 ref={(r) => this.csvLink = r}
	                 target="_blank" />
	    
	const tabPanel = (this.state.columns.length != 0 && this.state.csColumns.length != 0)?
	      <Tabs forceRenderTabPanel={true} selectedIndex={this.state.selectedTab} onSelect={this.onTabSelect} style={{width: '100%'}}>
	        <TabList>
		<Tab>Credible Sets</Tab>
		<Tab>Traditional</Tab>
		</TabList>
		<TabPanel style={{ display: this.state.selectedTab == 0 ? 'block' : 'none'}}>
			<div id="cs table" style={{height: '100%', width: '100%'}}>
				{cs_table}
			</div>
		</TabPanel>
		<TabPanel style={{ display: this.state.selectedTab == 1 ? 'block' : 'none'}}>
			<div id="traditional table" style={{height: '100%', width: '100%'}}>
				{var_table}
			</div>
		</TabPanel>
	    </Tabs>:
	(this.state.columns.length != 0) ? traditional : (this.state.csColumns.length != 0 ? credibleSet : <></>);

        return (
		<div style={{width: '100%', padding: '0'}}>
		<h2 style={{marginTop: 0}}>{this.state.pheno.phenostring}</h2>
		<p>{this.state.pheno.category}</p>
		{risteys}
		<table className='column_spacing'>
		{n_cc1}
		</table>
                {summary}
	        {csvLink}
                {ukbb}
		<div id='manhattan_plot_container' />
		<h3>{is_cs}</h3>
	        {tabPanel}
		<div style={{float:'left'}}>
		<h3>QQ plot</h3>
		<div id='qq_plot_container' style={{width:'400px'}} />
		{qq_table}
		</div>
		<div>
		{n_cc2}
		</div>
		</div>
        )
    }
}

export default Pheno
