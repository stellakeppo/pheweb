from typing import List
import os
import imp
import itertools
from collections import OrderedDict, Counter
from copy import deepcopy
from boltons.fileutils import mkdir_p

# This module creates the object `conf`.
# It also offers some configuration-related utility functions.

try:
    from . import utils
except:
    import utils


def Attrdict():
    # LATER: make this a real class  which defines the attributes it may have, and then move conf.parse to its own module.
    defaults = {}
    attrs = {}

    class _Attrdict:
        """like dict but dict.key is a proxy for dict[key], and dict.set_default_value(key, value) sets a default."""

        def __getattr__(self, attr):
            try:
                return self[attr]
            except KeyError:
                raise AttributeError(
                    "Attrdict doesn't contain the attr {!r} and has no default".format(
                        attr
                    )
                )

        def __setattr__(self, attr, val):
            self[attr] = val

        def __delattr__(self, attr):
            del self[attr]

        def __getitem__(self, attr):
            _ensure_conf()
            try:
                return attrs[attr]
            except KeyError:
                if attr in defaults:
                    x = defaults[attr]
                    if x[0]:
                        return x[1]()
                    else:
                        return x[1]
                raise KeyError(
                    "Attrdict doesn't contain the key {!r} and has no default".format(
                        attr
                    )
                )

        def __setitem__(self, attr, val):
            attrs[attr] = val

        def __delitem__(self, attr):
            del attrs[attr]

        def get(self, attr, default=None):
            try:
                return self[attr]
            except KeyError:
                return default

        def __contains__(self, attr):
            return attr in attrs or attr in defaults

        def set_default_value(self, attr, func, is_function=False):
            defaults[attr] = (is_function, func)
            return None

        def has_own_property(self, attr):
            return attr in attrs

        def __str__(self):
            _ensure_conf()
            ret = "".join(
                "{} = {}\n".format(k, self[k]) for k in sorted(attrs) if k != "parse"
            )
            if ret:
                ret += "\n"
            ret += "[defaults]\n"
            ret += "\n".join(
                "{} = {}".format(k, self[k]) for k in sorted(defaults) if k not in attrs
            )
            return ret

    return _Attrdict()


conf = Attrdict()
conf.parse = Attrdict()


def _run_only_once(f):
    def f2():
        if not hasattr(f2, "_already_ran"):
            f2._already_ran = True
            f()

    return f2


@_run_only_once
def _ensure_conf():

    if not hasattr(conf, "authentication"):
        conf.set_default_value("authentication", False)

    if hasattr(conf, "data_dir"):
        conf.data_dir = os.path.abspath(conf.data_dir)
    else:
        conf.set_default_value(
            "data_dir",
            os.path.abspath(os.environ.get("PHEWEB_DATADIR", False) or os.path.curdir),
        )

    ## Get `conf.cache` working because it's needed for reporting errors
    def _configure_cache():
        conf.set_default_value(
            "cache", os.path.abspath(os.path.expanduser("~/.pheweb/cache"))
        )
        if conf.cache is False:
            return
        if conf.has_own_property("cache"):
            conf.cache = os.path.abspath(
                os.path.join(conf.data_dir, os.path.expanduser(conf.cache))
            )
        if not os.path.isdir(conf.cache):
            try:
                mkdir_p(conf.cache)
            except PermissionError:
                print(
                    "Warning: caching is disabled because the directory {!r} can't be created.\n".format(
                        conf.cache
                    )
                    + "If you don't want caching, set `cache = False` in your config.py."
                )
                conf.cache = False
                return
        if not os.access(conf.cache, os.R_OK):
            print(
                "Warning: the directory {!r} is configured to be your cache directory but it is not readable.\n".format(
                    conf.cache
                )
                + "If you don't want caching, set `cache = False` in your config.py."
            )
            conf.cache = False

    _configure_cache()

    def _load_config_file():
        _config_filepath = os.path.join(conf.data_dir, "config.py")
        if os.path.isfile(_config_filepath):
            try:
                _conf_module = imp.load_source("config", _config_filepath)
            except Exception:
                raise utils.PheWebError(
                    "PheWeb tried to load your config.py at {!r} but it failed.".format(
                        _config_filepath
                    )
                )
            else:
                for key in dir(_conf_module):
                    if not key.startswith("_"):
                        conf[key] = getattr(_conf_module, key)
        print(str(conf))
        if conf.authentication:
            try:
                _auth_module = imp.load_source("config", conf.authentication_file)
            except Exception:
                raise utils.PheWebError(
                    "PheWeb tried to load your authentication file at {!r} but it failed.".format(
                        conf.authentication_file
                    )
                )
            else:
                for key in dir(_auth_module):
                    if not key.startswith("_"):
                        conf[key] = getattr(_conf_module, key)

    _load_config_file()

    conf.set_default_value(
        "custom_templates",
        lambda: os.path.join(conf.data_dir, "custom_templates"),
        is_function=True,
    )
    conf.set_default_value("debug", False)
    conf.set_default_value("quick", False)
    conf.set_default_value("assoc_min_maf", 0)
    conf.set_default_value("variant_inclusion_maf", 0)
    conf.set_default_value("within_pheno_mask_around_peak", int(500e3))
    conf.set_default_value("between_pheno_mask_around_peak", int(1e6))
    conf.set_default_value("manhattan_num_unbinned", 2000)
    conf.set_default_value("manhattan_unbin_anyway_pval", 5e-8)
    conf.set_default_value("manhattan_hla_num_unbinned", 200)
    conf.set_default_value("hla_begin", 26000000)
    conf.set_default_value("hla_end", 36000000)
    conf.set_default_value("n_query_threads", 4)
    conf.set_default_value("peak_pval_cutoff", 1e-6)

    if "minimum_maf" in conf:
        raise utils.PheWebError(
            "minimum_maf has been deprecated.  Please remove it and use assoc_min_maf and/or variant_inclusion_maf instead"
        )

    if conf.get("login", {}).get("whitelist", None):
        conf.login["whitelist"] = [addr.lower() for addr in conf.login["whitelist"]]

    if not os.path.isdir(conf.data_dir):
        mkdir_p(conf.data_dir)
    if not os.access(conf.data_dir, os.R_OK):
        raise utils.PheWebError(
            "Your data directory, {!r}, is not readable.".format(conf.data_dir)
        )

    ### Parsing

    def scientific_int(value):
        '''like int(value) but accepts "1.3e-4"'''
        try:
            return int(value)
        except ValueError:
            x = float(value)
            if x.is_integer():
                return int(x)
            raise

    class Field:
        def __init__(self, d):
            self._d = d

        def parse(self, value):
            """parse from input file"""
            # nullable
            if self._d["nullable"] and value in conf.parse.null_values:
                return ""
            # type
            x = self._d["type"](value)
            # range
            if "range" in self._d:
                assert self._d["range"][0] is None or x >= self._d["range"][0]
                assert self._d["range"][1] is None or x <= self._d["range"][1]
            if "sigfigs" in self._d:
                x = utils.round_sig(x, self._d["sigfigs"])
            if "decimals" in self._d:
                x = round(x, self._d["decimals"])
            return x

        def read(self, value):
            """read from internal file"""
            if self._d["nullable"] and (value == "" or value == "NA"):
                return ""
            x = self._d["type"](value)
            if "range" in self._d:
                assert self._d["range"][0] is None or x >= self._d["range"][0]
                assert self._d["range"][1] is None or x <= self._d["range"][1]
            return x

    default_null_values = ["", ".", "NA", "nan", "NaN"]

    default_field = {
        "aliases": [],
        "required": False,
        "type": str,
        "nullable": False,
        "from_assoc_files": True,  # if this is False, then the field will not be parsed from input files, because annotation will add it.
    }

    default_per_variant_fields = OrderedDict(
        [
            (
                "chrom",
                {
                    "aliases": ["#CHROM", "chr"],
                    "required": True,
                    "tooltip_underscoretemplate": "<b><%= d.chrom %>:<%= d.pos.toLocaleString() %> <%= d.ref %> / <%= d.alt %></b><br>",
                    "tooltip_lztemplate": False,
                },
            ),
            (
                "pos",
                {
                    "aliases": ["BEG", "BEGIN", "BP"],
                    "required": True,
                    "type": scientific_int,
                    "range": [0, None],
                    "tooltip_underscoretemplate": False,
                    "tooltip_lztemplate": False,
                },
            ),
            (
                "ref",
                {
                    "aliases": ["reference", "allele0"],
                    "required": True,
                    "tooltip_underscoretemplate": False,
                    "tooltip_lztemplate": False,
                },
            ),
            (
                "alt",
                {
                    "aliases": ["alternate", "allele1"],
                    "required": True,
                    "tooltip_underscoretemplate": False,
                    "tooltip_lztemplate": False,
                },
            ),
            (
                "rsids",
                {
                    "from_assoc_files": False,
                    "tooltip_underscoretemplate": '<% _.each(_.filter((d.rsids||"").split(",")), function(rsid) { %>rsid: <%= rsid %><br><% }) %>',
                    "tooltip_lztemplate": {
                        "condition": "rsid",
                        "template": "<strong>{{rsid}}</strong><br>",
                    },
                },
            ),
            (
                "nearest_genes",
                {
                    "from_assoc_files": False,
                    "tooltip_underscoretemplate": 'nearest gene<%= _.contains(d.nearest_genes, ",")? "s":"" %>: <%= d.nearest_genes %><br>',
                    "tooltip_lztemplate": False,
                },
            ),
        ]
    )

    default_per_assoc_fields = OrderedDict(
        [
            (
                "pheno",
                {
                    "tooltip_lztemplate": "phenotype: <strong>{{trait:pheno}}</strong><br>",
                },
            ),
            (
                "pval",
                {
                    "aliases": ["PVALUE"],
                    "required": True,
                    "type": float,
                    "nullable": True,
                    "range": [0, 1],
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": "p-value: <%= pValueToReadable(d.pval) %><br>",
                    "tooltip_lztemplate": {
                        "condition": False,
                        "template": (
                            "{{#if trait:pvalue}}p-value: <strong>{{trait:pvalue|scinotation|formatPValue}}</strong><br>{{/if}}\n"
                            + "{{#if trait:pval}}p-value: <strong>{{trait:pval|scinotation|formatPValue}}</strong><br>{{/if}}"
                        ),
                    },
                    "display": "P-value",
                },
            ),
            (
                "mlogp",
                {
                    "required": True,
                    "type": float,
                    "nullable": True,
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": "mlog10p-value: <%= d.mlogp %><br>",
                    "tooltip_lztemplate": {
                        "condition": False,
                        "template": (
                            "mlog10p-value: <strong>{{trait:mlogp|scinotation}}</strong><br>"
                        ),
                    },
                    "display": "mlog10p-value",
                },
            ),
            (
                "beta",
                {
                    "type": float,
                    "nullable": True,
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": 'beta: <%= d.beta.toFixed(2) %><% if(_.has(d, "sebeta")){ %> (<%= d.sebeta.toFixed(2) %>)<% } %><br>',
                    "tooltip_lztemplate": "beta: <strong>{{trait:beta}}</strong>{{#if trait:sebeta}} ({{trait:sebeta}}){{/if}}<br>",
                    "display": "Beta",
                },
            ),
            (
                "sebeta",
                {
                    "aliases": ["se"],
                    "type": float,
                    "nullable": True,
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": False,
                    "tooltip_lztemplate": False,
                },
            ),
            (
                "or",
                {
                    "type": float,
                    "nullable": True,
                    "range": [0, None],
                    "sigfigs": 2,
                    "display": "Odds Ratio",
                },
            ),
            (
                "af_alt",
                {
                    "type": float,
                    "nullable": True,
                    "range": [0, 1],
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": "AF: <%= d.af_alt.toFixed(4) %><br>",
                    "tooltip_lztemplate": {"transform": "|percent"},
                    "display": "AF",
                },
            ),
            (
                "af_alt_cases",
                {
                    "type": float,
                    "range": [0, 1],
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": "AF cases: <%= d.af_alt_cases.toFixed(4) %><br>",
                    "tooltip_lztemplate": {"transform": "|percent"},
                    "display": "AF cases",
                },
            ),
            (
                "af_alt_controls",
                {
                    "aliases": ["af_alt_controls"],
                    "type": float,
                    "range": [0, 1],
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": "AF controls: <%= d.af_alt_controls.toFixed(4) %><br>",
                    "tooltip_lztemplate": {"transform": "|percent"},
                    "display": "AF controls",
                },
            ),
            (
                "maf",
                {
                    "type": float,
                    "nullable": True,
                    "range": [0, 1],
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": "AF: <%= d.maf.toFixed(4) %><br>",
                    "tooltip_lztemplate": {"transform": "|percent"},
                    "display": "AF",
                },
            ),
            (
                "maf_cases",
                {
                    "type": float,
                    "range": [0, 1],
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": "AF cases: <%= d.maf_cases.toFixed(4) %><br>",
                    "tooltip_lztemplate": {"transform": "|percent"},
                    "display": "AF cases",
                },
            ),
            (
                "maf_controls",
                {
                    "type": float,
                    "range": [0, 1],
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": "AF controls: <%= d.maf_controls.toFixed(4) %><br>",
                    "tooltip_lztemplate": {"transform": "|percent"},
                    "display": "AF controls",
                },
            ),
            (
                "af",
                {
                    "aliases": ["A1FREQ"],
                    "type": float,
                    "range": [0, 1],
                    "sigfigs": 2,  # TODO: never round 99.99% to 100%.  Make sure MAF would have the right sigfigs.
                    "tooltip_lztemplate": {"transform": "|percent"},
                    "display": "AF",
                },
            ),
            (
                "ac",
                {
                    "type": float,
                    "range": [0, None],
                    "decimals": 1,
                    "tooltip_underscoretemplate": "AC: <%= d.ac.toFixed(1) %> <br>",
                    "display": "AC",
                },
            ),
            (
                "r2",
                {
                    "type": float,
                    "sigfigs": 2,
                    "nullable": True,
                    "display": "R2",
                },
            ),
            (
                "tstat",
                {
                    "type": float,
                    "sigfigs": 2,
                    "nullable": True,
                    "display": "Tstat",
                },
            ),
            ("n_cohorts", {"type": int}),
            ("n_hom_cases", {"type": float}),
            ("n_hom_ref_cases", {"type": float}),
            ("n_het_cases", {"type": float}),
            ("n_hom_controls", {"type": float}),
            ("n_hom_ref_controls", {"type": float}),
            ("n_het_controls", {"type": float}),
        ]
    )

    default_per_pheno_fields = OrderedDict(
        [
            (
                "n_case",
                {
                    "aliases": ["NS.CASE", "N_cases"],
                    "type": int,
                    "nullable": True,
                    "range": [0, None],
                    "display": "#cases",
                },
            ),
            (
                "n_control",
                {
                    "aliases": ["NS.CTRL", "N_controls"],
                    "type": int,
                    "nullable": True,
                    "range": [0, None],
                    "display": "#controls",
                },
            ),
            (
                "num_samples",
                {
                    "aliases": ["NS", "N"],
                    "type": int,
                    "nullable": True,
                    "range": [0, None],
                    "display": "#samples",
                },
            ),
            # TODO: phenocode, phenostring, category, &c?
            # TODO: include `assoc_files` with {never_send: True}?
        ]
    )

    default_GWAS_catalog_fields = OrderedDict(
        [
            (
                "pheno",
                {
                    "tooltip_lztemplate": "phenotype: <strong>{{pheno}}</strong><br>",
                },
            ),
            (
                "pval",
                {
                    "aliases": ["PVALUE"],
                    "required": True,
                    "type": float,
                    "nullable": True,
                    "range": [0, 1],
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": "p-value: <%= pValueToReadable(d.pval) %><br>",
                    "tooltip_lztemplate": {
                        "condition": False,
                        "template": (
                            "{{#if pvalue}}p-value: <strong>{{pvalue|scinotation}}</strong><br>{{/if}}\n"
                            + "{{#if pval}}p-value: <strong>{{pval|scinotation}}</strong><br>{{/if}}"
                        ),
                    },
                    "display": "P-value",
                },
            ),
            (
                "beta",
                {
                    "type": float,
                    "nullable": True,
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": 'beta: <%= d.beta.toFixed(2) %><% if(_.has(d, "sebeta")){ %> (<%= d.sebeta.toFixed(2) %>)<% } %><br>',
                    "tooltip_lztemplate": "beta: <strong>{{beta}}</strong>{{#if sebeta}} ({{sebeta}}){{/if}}<br>",
                    "display": "Beta",
                },
            ),
            (
                "sebeta",
                {
                    "aliases": ["se"],
                    "type": float,
                    "nullable": True,
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": False,
                    "tooltip_lztemplate": False,
                },
            ),
            (
                "or",
                {
                    "type": float,
                    "nullable": True,
                    "range": [0, None],
                    "sigfigs": 2,
                    "display": "Odds Ratio",
                },
            ),
            (
                "maf",
                {
                    "type": float,
                    "range": [0, 0.5],
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": "MAF: <%= d.maf.toFixed(4) %><br>",
                    "tooltip_lztemplate": {"transform": "|percent"},
                    "display": "MAF",
                },
            ),
            (
                "maf_cases",
                {
                    "type": float,
                    "range": [0, 1],
                    "sigfigs": 2,
                    "tooltip_underscoretemplate": "MAF cases: <%= d.maf_cases.toFixed(4) %><br>",
                    "tooltip_lztemplate": {"transform": "|percent"},
                    "display": "MAF cases",
                },
            ),
        ]
    )

    conf.parse.null_values = deepcopy(default_null_values)
    conf.parse.per_variant_fields = deepcopy(default_per_variant_fields)
    conf.parse.per_assoc_fields = deepcopy(default_per_assoc_fields)
    conf.parse.per_pheno_fields = deepcopy(default_per_pheno_fields)
    conf.parse.fields = OrderedDict(
        itertools.chain(
            conf.parse.per_variant_fields.items(),
            conf.parse.per_assoc_fields.items(),
            conf.parse.per_pheno_fields.items(),
        )
    )
    assert len(conf.parse.fields) == len(conf.parse.per_variant_fields) + len(
        conf.parse.per_assoc_fields
    ) + len(
        conf.parse.per_pheno_fields
    )  # no overlaps!

    if "aliases" in conf:
        for alias, field in conf.aliases.items():
            conf.parse.fields[field].setdefault("aliases", []).append(alias)

    if "null_values" in conf:
        conf.parse.null_values.extend(conf.null_values)

    # make all aliases lowercase and add parsers
    for field_name, field_dict in conf.parse.fields.items():
        for k, v in default_field.items():
            field_dict.setdefault(k, v)
        field_dict["aliases"] = list(
            set(
                [field_name.lower()]
                + [alias.lower() for alias in field_dict["aliases"]]
            )
        )
        field_dict["_parse"] = Field(field_dict).parse
        field_dict["_read"] = Field(field_dict).read

    _repeated_aliases = [
        alias
        for alias, count in Counter(
            itertools.chain.from_iterable(
                f["aliases"] for f in conf.parse.fields.values()
            )
        ).most_common()
        if count > 1
    ]
    if _repeated_aliases:
        raise utils.PheWebError(
            "The following aliases appear for multiple fields: {}".format(
                _repeated_aliases
            )
        )

    def get_tooltip_underscoretemplate():
        template = ""
        for fieldname, field in conf.parse.fields.items():
            if "tooltip_underscoretemplate" in field:
                if field["tooltip_underscoretemplate"] is False:
                    continue
                else:
                    template += (
                        "<% if(_.has(d, "
                        + repr(fieldname)
                        + ")) { %>"
                        + field["tooltip_underscoretemplate"]
                        + "<% } %>\n"
                    )
            else:
                template += (
                    "<% if(_.has(d, "
                    + repr(fieldname)
                    + ")) { %>"
                    + field.get("display", fieldname)
                    + ": <%= d["
                    + repr(fieldname)
                    + "] %><br><% } %>\n"
                )
        return template

    conf.parse.tooltip_underscoretemplate = get_tooltip_underscoretemplate()

    def get_tooltip_lztemplate():
        template = ""
        for fieldname, field in conf.parse.fields.items():
            lzt = field.get("tooltip_lztemplate", {})
            if lzt is False:
                continue
            if isinstance(lzt, str):
                lzt = {"template": lzt}
            if "template" not in lzt:
                lzt["template"] = (
                    field.get("display", fieldname)
                    + ": <strong>{{"
                    + fieldname
                    + lzt.get("transform", "")
                    + "}}</strong><br>"
                )
            if "condition" not in lzt:
                lzt["condition"] = fieldname

            if not lzt["condition"]:
                template += lzt["template"] + "\n"
            else:
                template += (
                    "{{#if " + lzt["condition"] + "}}" + lzt["template"] + "{{/if}}\n"
                )
        return template

    conf.parse.tooltip_lztemplate = get_tooltip_lztemplate()

    ## these fields will be exported in this order when exporting variants to TSV.
    conf.set_default_value(
        "var_export_fields",
        [
            "chrom",
            "pos",
            "ref",
            "alt",
            "maf",
            "maf_cases",
            "maf_controls",
            "most_severe",
            "nearest_genes",
            "rsids",
            "annotation.ac",
            "annotation.ac_hemi",
            "annotation.ac_het",
            "annotation.ac_hom",
            "annotation.an",
            "annotation.info",
            "annotation.hc_lof",
        ],
    )

    ## these fields will be exported in this order when exporting variants to TSV.
    conf.set_default_value(
        "var_top_pheno_export_fields",
        [
            "phenocode",
            "phenostring",
            "category",
            "pval",
            "beta",
            "maf",
            "maf_case",
            "maf_control",
            "n_case",
            "n_control",
        ],
    )
    conf.set_default_value(
        "gene_pheno_export_fields",
        [
            "variant.varid",
            "assoc.pval",
            "assoc.beta",
            "assoc.variant.rsids",
            "pheno.category",
            "pheno.num_cases",
            "pheno.num_controls",
            "pheno.phenocode",
            "pheno.phenostring",
            "variant.annotation.gnomad.AF_fin",
            "variant.annotation.gnomad.AF_nfe",
        ],
    )
    conf.set_default_value(
        "drug_export_fields",
        [
            "drug.molecule_name",
            "drug.molecule_type",
            "evidence.target2drug.action_type",
            "disease.efo_info.label",
            "evidence.drug2clinic.clinical_trial_phase.label",
            "drug.id",
        ],
    )
    conf.set_default_value(
        "lof_export_fields",
        ["pheno", "variants", "p_value", "beta", "ref_alt_cases", "ref_alt_ctrls"],
    )

    conf.set_default_value("report_conf", {"func_var_assoc_threshold": 0.0001})
    conf.set_default_value(
        "vis_conf",
        {
            "loglog_threshold": 10,
            "info_tooltip_threshold": 0.8,
            "manhattan_colors": ["rgb(53,0,212)", "rgb(40, 40, 40)"],
        },
    )
    conf.set_default_value(
        "locuszoom_conf",
        {
            "p_threshold": 0.05,
            "prob_threshold": 0.0001,
            "ld_service": "finngen",
            "ld_max_window": 5000000,
        },
    )
    conf.set_default_value("lof_threshold", 1e-3)
    conf.set_default_value("noindex", True)
    conf.set_default_value("anno_cpra", True)
    conf.set_default_value("show_ukbb", False)
    conf.set_default_value("show_risteys", False)
    conf.set_default_value("lof_threshold", 1e-3)
    conf.set_default_value("GLOBAL_SITE_TAG_ID", None)
    conf.set_default_value("STRICT_SCHEMA", True)


def get_field_parser(colname: str, strict_schema: bool = conf.STRICT_SCHEMA):
    """
    Returns a parser for the column name
    supplied.  If not set up for strict schema
    it returns the identity function.
    """
    if colname in conf.parse.fields:
        return conf.parse.fields[colname]["_read"]
    elif not strict_schema:
        return lambda x: x
    else:
        raise KeyError("{field} not found in parse.fields")


def validate_fields(colnames: List[str], strict_schema: bool = conf.STRICT_SCHEMA):
    """
    Checks by assertion the fields are valid
    """
    if not strict_schema:
        for field in colnames:
            assert (
                field in conf.parse.per_variant_fields
                or field in conf.parse.per_assoc_fields
            ), field
