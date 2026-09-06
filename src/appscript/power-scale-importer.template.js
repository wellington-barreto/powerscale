/**
 * POWER SCALE — Google Ads Importer
 * Template servido pelo endpoint /api/v1/google-ads/appscript/code/:uuid.
 * O backend substitui {{USER_UUID}} antes de entregar o JavaScript.
 */

/* POWER SCALE — Importador Google Ads. Adaptado para o backend POWER SCALE. */
const RUN_ERRORS = [];
function logErr(_0xaba994, _0x2690f6) {
  const _0x35b016 = String(_0x2690f6 == null ? "erro desconhecido" : _0x2690f6);
  Logger.log('[' + _0xaba994 + "] " + _0x35b016);
  if (RUN_ERRORS.length < 0x32) {
    RUN_ERRORS.push({
      'scope': _0xaba994,
      'message': _0x35b016.slice(0x0, 0x12c)
    });
  }
}
function powerScaleRun() {
  const _0x3a0804 = Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'");
  try {
    runImport();
  } catch (_0xefc3d5) {
    logErr("fatal", _0xefc3d5.message + (_0xefc3d5.stack ? " | " + String(_0xefc3d5.stack).slice(0x0, 0xc8) : ''));
    throw _0xefc3d5;
  } finally {
    reportRunToBackend(_0x3a0804);
  }
}
function runImport() {
  const _0x1ffbe6 = fetchRunConfig();
  const _0x40e881 = getDateRange(_0x1ffbe6);
  Logger.log("Período: " + _0x40e881.start + " a " + _0x40e881.end + " (" + _0x1ffbe6 + " dias)");
  const _0x131957 = prefetchCampaignInfo();
  const _0x4bd5c4 = _0x131957.map;
  const _0x1d242b = _0x131957.flags;
  Logger.log("Canais: video=" + _0x1d242b.hasVideo + " pmax=" + _0x1d242b.hasPmax + " display=" + _0x1d242b.hasDisplay + " demandgen=" + _0x1d242b.hasDemandGen);
  flushCampaignRoster(_0x4bd5c4, _0x131957.account);
  const _0x554c66 = prefetchCheckout(_0x40e881);
  const _0x558bd2 = fetchAdGroupData(_0x40e881, _0x4bd5c4, _0x554c66.adGroupMap);
  fetchCampaignLevel(_0x40e881, _0x4bd5c4, _0x554c66.campaignMap, _0x558bd2);
  fetchGenderData(_0x40e881);
  fetchAgeData(_0x40e881);
  fetchAudienceData(_0x40e881);
  fetchKeywordData(_0x40e881);
  fetchDeviceData(_0x40e881);
  fetchAdData(_0x40e881);
  fetchHourData(_0x40e881);
  fetchDayOfWeekData(_0x40e881);
  fetchLocationData(_0x40e881);
  fetchPlacementData(_0x40e881);
  fetchSearchTermData(_0x40e881);
  fetchAssetData(_0x40e881);
  fetchLabelData(_0x40e881);
  if (_0x1d242b.hasVideo) {
    fetchVideoData(_0x40e881);
  }
  if (_0x1d242b.hasPmax) {
    fetchPMaxAssetGroupData(_0x40e881);
  }
  if (_0x1d242b.hasPmax) {
    fetchPMaxAssetPerformanceData(_0x40e881);
  }
  if (_0x1d242b.hasDisplay || _0x1d242b.hasPmax) {
    fetchDisplayCreativeData(_0x40e881);
  }
  if (_0x1d242b.hasDemandGen) {
    fetchDemandGenCreativeData(_0x40e881);
  }
  Logger.log("Importação concluída.");
}
function prefetchCampaignInfo() {
  const _0x2abf1a = {};
  const _0x1467d2 = {
    'hasVideo': false,
    'hasPmax': false,
    'hasDisplay': false,
    'hasDemandGen': false
  };
  let _0x13b2e2 = null;
  try {
    const _0x1dc580 = AdsApp.search("\n      SELECT\n        customer.id, customer.descriptive_name, customer.currency_code,\n        campaign.id, campaign.name, campaign.status,\n        campaign.advertising_channel_type,\n        campaign_budget.amount_micros,\n        campaign.target_cpa.target_cpa_micros,\n        campaign.maximize_conversions.target_cpa_micros,\n        bidding_strategy.target_cpa.target_cpa_micros,\n        bidding_strategy.maximize_conversions.target_cpa_micros,\n        accessible_bidding_strategy.target_cpa.target_cpa_micros,\n        accessible_bidding_strategy.maximize_conversions.target_cpa_micros\n      FROM campaign\n    ");
    while (_0x1dc580.hasNext()) {
      const _0x1e9b17 = _0x1dc580.next();
      const _0x3d0c9d = _0x1e9b17.campaign && _0x1e9b17.campaign.id ? String(_0x1e9b17.campaign.id) : null;
      if (!_0x3d0c9d) {
        continue;
      }
      const _0x334823 = microsToCurrency(_0x1e9b17.campaignBudget && _0x1e9b17.campaignBudget.amountMicros);
      let _0x4494bb = microsToCurrency(_0x1e9b17.biddingStrategy?.["targetCpa"]?.["targetCpaMicros"]);
      if (!_0x4494bb) {
        _0x4494bb = microsToCurrency(_0x1e9b17.biddingStrategy?.["maximizeConversions"]?.["targetCpaMicros"]);
      }
      if (!_0x4494bb) {
        _0x4494bb = microsToCurrency(_0x1e9b17.accessibleBiddingStrategy?.["targetCpa"]?.["targetCpaMicros"]);
      }
      if (!_0x4494bb) {
        _0x4494bb = microsToCurrency(_0x1e9b17.accessibleBiddingStrategy?.["maximizeConversions"]?.["targetCpaMicros"]);
      }
      if (!_0x4494bb) {
        _0x4494bb = microsToCurrency(_0x1e9b17.campaign?.["targetCpa"]?.["targetCpaMicros"]);
      }
      if (!_0x4494bb) {
        _0x4494bb = microsToCurrency(_0x1e9b17.campaign?.["maximizeConversions"]?.["targetCpaMicros"]);
      }
      const _0x1d2bb9 = _0x1e9b17.campaign.advertisingChannelType || null;
      _0x2abf1a[_0x3d0c9d] = {
        'name': _0x1e9b17.campaign.name || null,
        'status': _0x1e9b17.campaign.status || null,
        'budget_daily': _0x334823 || null,
        'target_cpa': _0x4494bb || null,
        'channel': _0x1d2bb9
      };
      if (!_0x13b2e2 && _0x1e9b17.customer && _0x1e9b17.customer.id) {
        _0x13b2e2 = {
          'id': String(_0x1e9b17.customer.id),
          'name': _0x1e9b17.customer.descriptiveName || null,
          'currency': _0x1e9b17.customer.currencyCode || null
        };
      }
      switch (_0x1d2bb9) {
        case "VIDEO":
          _0x1467d2.hasVideo = true;
          break;
        case "PERFORMANCE_MAX":
          _0x1467d2.hasPmax = true;
          break;
        case "DISPLAY":
          _0x1467d2.hasDisplay = true;
          break;
        case "DEMAND_GEN":
          _0x1467d2.hasDemandGen = true;
          break;
      }
    }
    Logger.log("[prefetch_campaign] " + Object.keys(_0x2abf1a).length + " campanhas");
  } catch (_0x410522) {
    logErr("prefetch_campaign", "erro: " + _0x410522.message);
  }
  return {
    'map': _0x2abf1a,
    'flags': _0x1467d2,
    'account': _0x13b2e2
  };
}
function flushCampaignRoster(_0x33fc01, _0x5f1971) {
  if (!_0x5f1971 || !_0x5f1971.id) {
    Logger.log("[roster] conta não resolvida — pulando roster");
    return;
  }
  const _0x3a8523 = [];
  Object.keys(_0x33fc01 || {}).forEach(function (_0x20c2b8) {
    const _0x2b038c = _0x33fc01[_0x20c2b8] || {};
    if (!_0x2b038c.name) {
      return;
    }
    if (_0x2b038c.status === "REMOVED") {
      return;
    }
    _0x3a8523.push({
      'source': "google_ads",
      'segment': "campaign_roster",
      'account': {
        'id': String(_0x5f1971.id),
        'name': _0x5f1971.name || null,
        'currency': _0x5f1971.currency || null
      },
      'campaign': {
        'id': String(_0x20c2b8),
        'name': _0x2b038c.name,
        'status': _0x2b038c.status || null,
        'channel_type': _0x2b038c.channel || null,
        'target_cpa': _0x2b038c.target_cpa || null,
        'budget_daily': _0x2b038c.budget_daily || null
      },
      'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
    });
  });
  Logger.log("[roster] " + _0x3a8523.length + " campanhas registradas");
  flushSegment(_0x3a8523);
}
function prefetchCheckout(_0x55f0b6) {
  const _0x1de462 = {};
  const _0x1973ab = {};
  const _0x5cc0d4 = {};
  try {
    const _0x3c3c37 = AdsApp.search("SELECT conversion_action.id, conversion_action.name, conversion_action.category FROM conversion_action");
    const _0x374fcc = ["BEGIN_CHECKOUT", "OUTBOUND_CLICK"];
    while (_0x3c3c37.hasNext()) {
      const _0x4f34cc = _0x3c3c37.next();
      const _0x20df5e = _0x4f34cc.conversionAction && _0x4f34cc.conversionAction.id ? String(_0x4f34cc.conversionAction.id) : '';
      const _0x365084 = _0x4f34cc.conversionAction && _0x4f34cc.conversionAction.category;
      if (_0x20df5e && _0x374fcc.indexOf(_0x365084) !== -0x1) {
        _0x5cc0d4[_0x20df5e] = true;
      }
    }
    Logger.log("[checkout] " + Object.keys(_0x5cc0d4).length + " ações de checkout encontradas");
  } catch (_0x16bc79) {
    logErr("checkout", "erro ao buscar ações: " + _0x16bc79.message);
    return {
      'adGroupMap': _0x1de462,
      'campaignMap': _0x1973ab
    };
  }
  if (Object.keys(_0x5cc0d4).length === 0x0) {
    return {
      'adGroupMap': _0x1de462,
      'campaignMap': _0x1973ab
    };
  }
  try {
    const _0x4d4828 = "\n      SELECT\n        campaign.id,\n        ad_group.id,\n        segments.date,\n        segments.conversion_action,\n        metrics.all_conversions,\n        metrics.all_conversions_value\n      FROM ad_group\n      WHERE segments.date BETWEEN '" + _0x55f0b6.start + "' AND '" + _0x55f0b6.end + "'\n        AND metrics.all_conversions > 0\n    ";
    const _0x230dab = AdsApp.search(_0x4d4828);
    while (_0x230dab.hasNext()) {
      const _0x4d20a6 = _0x230dab.next();
      const _0x4130da = _0x4d20a6.segments.conversionAction ? _0x4d20a6.segments.conversionAction.split('/').pop() : '';
      if (!_0x4130da || !_0x5cc0d4[_0x4130da]) {
        continue;
      }
      const _0x1034e3 = _0x4d20a6.segments.date;
      const _0x4ff773 = Number(_0x4d20a6.metrics.allConversions) || 0x0;
      const _0xe97ee1 = Number(_0x4d20a6.metrics.allConversionsValue) || 0x0;
      const _0x3041d9 = _0x4d20a6.campaign && _0x4d20a6.campaign.id ? String(_0x4d20a6.campaign.id) : '';
      const _0x579014 = _0x4d20a6.adGroup && _0x4d20a6.adGroup.id ? String(_0x4d20a6.adGroup.id) : '';
      if (_0x579014) {
        accumulateCheckout(_0x1de462, _0x579014 + '|' + _0x1034e3, _0x4ff773, _0xe97ee1);
      }
      if (_0x3041d9) {
        accumulateCheckout(_0x1973ab, _0x3041d9 + '|' + _0x1034e3, _0x4ff773, _0xe97ee1);
      }
    }
  } catch (_0x31f539) {
    logErr("checkout", "erro ad_group: " + _0x31f539.message);
  }
  try {
    const _0x3f5d63 = "\n      SELECT\n        campaign.id,\n        segments.date,\n        segments.conversion_action,\n        metrics.all_conversions,\n        metrics.all_conversions_value\n      FROM campaign\n      WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'\n        AND segments.date BETWEEN '" + _0x55f0b6.start + "' AND '" + _0x55f0b6.end + "'\n        AND metrics.all_conversions > 0\n    ";
    const _0x1c6a98 = AdsApp.search(_0x3f5d63);
    while (_0x1c6a98.hasNext()) {
      const _0x522f3d = _0x1c6a98.next();
      const _0x5ddfcc = _0x522f3d.segments.conversionAction ? _0x522f3d.segments.conversionAction.split('/').pop() : '';
      if (!_0x5ddfcc || !_0x5cc0d4[_0x5ddfcc]) {
        continue;
      }
      const _0x205c23 = _0x522f3d.campaign && _0x522f3d.campaign.id ? String(_0x522f3d.campaign.id) : '';
      if (!_0x205c23) {
        continue;
      }
      accumulateCheckout(_0x1973ab, _0x205c23 + '|' + _0x522f3d.segments.date, Number(_0x522f3d.metrics.allConversions) || 0x0, Number(_0x522f3d.metrics.allConversionsValue) || 0x0);
    }
  } catch (_0x1be07a) {
    logErr("checkout", "erro pmax: " + _0x1be07a.message);
  }
  Logger.log("[checkout] " + Object.keys(_0x1de462).length + " ad_group/data | " + Object.keys(_0x1973ab).length + " campaign/data");
  return {
    'adGroupMap': _0x1de462,
    'campaignMap': _0x1973ab
  };
}
function accumulateCheckout(_0x8ed92, _0x3f3ff5, _0x266983, _0x1e6752) {
  if (!_0x8ed92[_0x3f3ff5]) {
    _0x8ed92[_0x3f3ff5] = {
      'checkout_conversions': 0x0,
      'checkout_value': 0x0
    };
  }
  _0x8ed92[_0x3f3ff5].checkout_conversions += _0x266983;
  _0x8ed92[_0x3f3ff5].checkout_value += _0x1e6752;
}
function fetchAdGroupData(_0x214aa8, _0x60255f, _0x4ccb00) {
  const _0x16b0a9 = [];
  const _0x22b3d4 = {};
  const _0x50d590 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name, campaign.status, campaign.bidding_strategy_type,\n      campaign.target_cpa.target_cpa_micros, campaign.target_roas.target_roas,\n      campaign.maximize_conversions.target_cpa_micros,\n      campaign.advertising_channel_type, campaign.advertising_channel_sub_type,\n      ad_group.id, ad_group.name, ad_group.status, ad_group.type,\n      ad_group.effective_target_cpa_micros, ad_group.effective_target_roas,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value,\n      metrics.all_conversions, metrics.all_conversions_value,\n      metrics.view_through_conversions, metrics.cross_device_conversions,\n      metrics.search_impression_share,\n      metrics.top_impression_percentage,\n      metrics.absolute_top_impression_percentage,\n      metrics.average_cpc, metrics.average_cpm,\n      metrics.active_view_impressions, metrics.active_view_measurability, metrics.active_view_viewability,\n      metrics.engagement_rate, metrics.engagements,\n      metrics.gmail_forwards, metrics.gmail_saves, metrics.gmail_secondary_clicks,\n      segments.date\n    FROM ad_group\n    WHERE segments.date BETWEEN '" + _0x214aa8.start + "' AND '" + _0x214aa8.end + "'\n  ";
  const _0x3aeee0 = AdsApp.search(_0x50d590);
  while (_0x3aeee0.hasNext()) {
    const _0x3774f3 = _0x3aeee0.next();
    const _0x45214c = String(_0x3774f3.campaign.id);
    const _0x5d7ddd = String(_0x3774f3.adGroup.id);
    const _0x230f16 = _0x3774f3.segments.date;
    const _0x1aa995 = _0x60255f[_0x45214c] || {};
    const _0x324371 = _0x4ccb00[_0x5d7ddd + '|' + _0x230f16] || null;
    _0x22b3d4[_0x45214c + '|' + _0x230f16] = true;
    _0x16b0a9.push({
      'source': "google_ads",
      'segment': "ad_group",
      'date': _0x230f16,
      'account': {
        'id': String(_0x3774f3.customer.id),
        'name': _0x3774f3.customer.descriptiveName
      },
      'campaign': {
        'id': _0x45214c,
        'name': _0x3774f3.campaign.name,
        'status': _0x3774f3.campaign.status,
        'bidding_strategy': _0x3774f3.campaign.biddingStrategyType,
        'channel_type': _0x3774f3.campaign.advertisingChannelType || null,
        'channel_sub_type': _0x3774f3.campaign.advertisingChannelSubType || null,
        'target_cpa': _0x1aa995.target_cpa || microsToCurrency(_0x3774f3.campaign?.["targetCpa"]?.["targetCpaMicros"]) || microsToCurrency(_0x3774f3.campaign?.["maximizeConversions"]?.["targetCpaMicros"]) || null,
        'target_roas': _0x3774f3.campaign?.["targetRoas"]?.["targetRoas"] || null,
        'budget_daily': _0x1aa995.budget_daily || null
      },
      'ad_group': {
        'id': _0x5d7ddd,
        'name': _0x3774f3.adGroup.name,
        'status': _0x3774f3.adGroup.status,
        'type': _0x3774f3.adGroup.type,
        'effective_target_cpa': microsToCurrency(_0x3774f3.adGroup.effectiveTargetCpaMicros) || null,
        'effective_target_roas': _0x3774f3.adGroup.effectiveTargetRoas || null
      },
      'metrics': buildMetrics(_0x3774f3.metrics, {
        'checkout': _0x324371
      }),
      'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
    });
  }
  Logger.log("[ad_group] " + _0x16b0a9.length + " registros");
  flushSegment(_0x16b0a9);
  return _0x22b3d4;
}
function fetchCampaignLevel(_0x441d19, _0x4bc1b5, _0x578937, _0x51b1d2) {
  const _0x222ccc = [];
  const _0x27a93a = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name, campaign.status, campaign.bidding_strategy_type,\n      campaign.target_cpa.target_cpa_micros, campaign.target_roas.target_roas,\n      campaign.maximize_conversions.target_cpa_micros,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value,\n      metrics.all_conversions, metrics.all_conversions_value,\n      metrics.average_cpc, metrics.average_cpm,\n      metrics.search_impression_share,\n      metrics.top_impression_percentage,\n      metrics.absolute_top_impression_percentage,\n      metrics.search_rank_lost_impression_share,\n      metrics.search_rank_lost_top_impression_share,\n      metrics.search_rank_lost_absolute_top_impression_share,\n      metrics.search_budget_lost_impression_share,\n      metrics.search_budget_lost_top_impression_share,\n      metrics.search_budget_lost_absolute_top_impression_share,\n      metrics.search_top_impression_share,\n      metrics.search_absolute_top_impression_share,\n      metrics.search_exact_match_impression_share,\n      metrics.search_click_share,\n      metrics.interactions, metrics.interaction_rate,\n      metrics.invalid_clicks, metrics.invalid_click_rate,\n      metrics.average_cost,\n      segments.date\n    FROM campaign\n    WHERE segments.date BETWEEN '" + _0x441d19.start + "' AND '" + _0x441d19.end + "'\n      AND campaign.status != 'REMOVED'\n  ";
  try {
    const _0x6cdba4 = AdsApp.search(_0x27a93a);
    while (_0x6cdba4.hasNext()) {
      const _0x12f751 = _0x6cdba4.next();
      const _0x1237e5 = String(_0x12f751.campaign.id);
      const _0x4575d4 = _0x12f751.segments.date;
      const _0x2574c2 = _0x4bc1b5[_0x1237e5] || {};
      const _0xc11e49 = Number(_0x12f751.metrics.impressions) || 0;
      const _0x490d09 = Number(_0x12f751.metrics.costMicros) || 0;
      if (_0xc11e49 === 0 && _0x490d09 === 0) continue;
      _0x222ccc.push({
        'source': 'google_ads',
        'segment': 'campaign_level',
        'date': _0x4575d4,
        'account': {
          'id': String(_0x12f751.customer.id),
          'name': _0x12f751.customer.descriptiveName
        },
        'campaign': {
          'id': _0x1237e5,
          'name': _0x12f751.campaign.name,
          'status': _0x12f751.campaign.status,
          'bidding_strategy': _0x12f751.campaign.biddingStrategyType,
          'target_cpa': _0x2574c2.target_cpa || microsToCurrency(_0x12f751.campaign?.['targetCpa']?.['targetCpaMicros']) || microsToCurrency(_0x12f751.campaign?.['maximizeConversions']?.['targetCpaMicros']) || null,
          'target_roas': _0x12f751.campaign?.['targetRoas']?.['targetRoas'] || null,
          'budget_daily': _0x2574c2.budget_daily || null
        },
        'metrics': buildMetrics(_0x12f751.metrics, {
          'checkout': _0x578937[_0x1237e5 + '|' + _0x4575d4] || null
        }),
        'imported_at': Utilities.formatDate(new Date(), 'GMT', "yyyy-MM-dd'T'HH:mm:ss'Z'")
      });
    }
  } catch (_0xerr) {
    logErr('campaign_level', 'erro: ' + _0xerr.message);
    return;
  }
  Logger.log('[campaign_level] ' + _0x222ccc.length + ' registros');
  flushSegment(_0x222ccc);
}

function fetchGenderData(_0x230252) {
  const _0xb3eb55 = [];
  const _0xd1dc92 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      ad_group.id, ad_group.name,\n      ad_group_criterion.gender.type, ad_group_criterion.criterion_id, ad_group_criterion.bid_modifier,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value, metrics.all_conversions, metrics.average_cpc,\n      segments.date\n    FROM gender_view\n    WHERE segments.date BETWEEN '" + _0x230252.start + "' AND '" + _0x230252.end + "'\n  ";
  try {
    const _0x2eeac6 = AdsApp.search(_0xd1dc92);
    while (_0x2eeac6.hasNext()) {
      const _0x3a9c21 = _0x2eeac6.next();
      _0xb3eb55.push({
        'source': "google_ads",
        'segment': "gender",
        'date': _0x3a9c21.segments.date,
        'account': {
          'id': String(_0x3a9c21.customer.id),
          'name': _0x3a9c21.customer.descriptiveName
        },
        'campaign': {
          'id': String(_0x3a9c21.campaign.id),
          'name': _0x3a9c21.campaign.name
        },
        'ad_group': {
          'id': String(_0x3a9c21.adGroup.id),
          'name': _0x3a9c21.adGroup.name
        },
        'gender': {
          'type': _0x3a9c21.adGroupCriterion.gender.type,
          'criterion_id': String(_0x3a9c21.adGroupCriterion.criterionId),
          'bid_modifier': _0x3a9c21.adGroupCriterion.bidModifier || null
        },
        'metrics': buildMetrics(_0x3a9c21.metrics),
        'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
      });
    }
  } catch (_0x42af1a) {
    logErr("gender", "erro: " + _0x42af1a.message);
    return;
  }
  Logger.log("[gender] " + _0xb3eb55.length + " registros");
  flushSegment(_0xb3eb55);
}
function fetchAgeData(_0x29e430) {
  const _0x5d5989 = [];
  const _0x592da6 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      ad_group.id, ad_group.name,\n      ad_group_criterion.age_range.type, ad_group_criterion.criterion_id, ad_group_criterion.bid_modifier,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value, metrics.all_conversions, metrics.average_cpc,\n      segments.date\n    FROM age_range_view\n    WHERE segments.date BETWEEN '" + _0x29e430.start + "' AND '" + _0x29e430.end + "'\n  ";
  try {
    const _0x4dc6bb = AdsApp.search(_0x592da6);
    while (_0x4dc6bb.hasNext()) {
      const _0x1b4714 = _0x4dc6bb.next();
      _0x5d5989.push({
        'source': "google_ads",
        'segment': "age_range",
        'date': _0x1b4714.segments.date,
        'account': {
          'id': String(_0x1b4714.customer.id),
          'name': _0x1b4714.customer.descriptiveName
        },
        'campaign': {
          'id': String(_0x1b4714.campaign.id),
          'name': _0x1b4714.campaign.name
        },
        'ad_group': {
          'id': String(_0x1b4714.adGroup.id),
          'name': _0x1b4714.adGroup.name
        },
        'age_range': {
          'type': _0x1b4714.adGroupCriterion.ageRange.type,
          'criterion_id': String(_0x1b4714.adGroupCriterion.criterionId),
          'bid_modifier': _0x1b4714.adGroupCriterion.bidModifier || null
        },
        'metrics': buildMetrics(_0x1b4714.metrics),
        'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
      });
    }
  } catch (_0x487786) {
    logErr("age_range", "erro: " + _0x487786.message);
    return;
  }
  Logger.log("[age_range] " + _0x5d5989.length + " registros");
  flushSegment(_0x5d5989);
}
function buildAudienceNameMap() {
  const _0x436b46 = {};
  try {
    const _0x500b54 = AdsApp.search("SELECT user_list.id, user_list.name, user_list.type FROM user_list");
    while (_0x500b54.hasNext()) {
      const _0x2e405f = _0x500b54.next();
      _0x436b46[String(_0x2e405f.userList.id)] = {
        'name': _0x2e405f.userList.name,
        'type': _0x2e405f.userList.type
      };
    }
  } catch (_0x187ee4) {
    logErr("audience_map", "user_list erro: " + _0x187ee4.message);
  }
  try {
    const _0x18fa82 = AdsApp.search("SELECT user_interest.user_interest_id, user_interest.name FROM user_interest");
    while (_0x18fa82.hasNext()) {
      const _0x3b019c = _0x18fa82.next();
      _0x436b46[String(_0x3b019c.userInterest.userInterestId)] = {
        'name': _0x3b019c.userInterest.name,
        'type': "USER_INTEREST"
      };
    }
  } catch (_0x45bf0a) {
    logErr("audience_map", "user_interest erro: " + _0x45bf0a.message);
  }
  try {
    const _0x2f1b08 = AdsApp.search("SELECT custom_audience.id, custom_audience.name, custom_audience.type FROM custom_audience");
    while (_0x2f1b08.hasNext()) {
      const _0x4bbbee = _0x2f1b08.next();
      _0x436b46[String(_0x4bbbee.customAudience.id)] = {
        'name': _0x4bbbee.customAudience.name,
        'type': _0x4bbbee.customAudience.type
      };
    }
  } catch (_0x4d990b) {
    logErr("audience_map", "custom_audience erro: " + _0x4d990b.message);
  }
  Logger.log("[audience_map] " + Object.keys(_0x436b46).length + " públicos mapeados");
  return _0x436b46;
}
function fetchAudienceData(_0x210ddf) {
  const _0x14f2b3 = [];
  const _0x21e026 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      ad_group.id, ad_group.name,\n      ad_group_criterion.criterion_id, ad_group_criterion.type,\n      ad_group_criterion.display_name,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value, metrics.all_conversions, metrics.average_cpc,\n      segments.date\n    FROM ad_group_audience_view\n    WHERE segments.date BETWEEN '" + _0x210ddf.start + "' AND '" + _0x210ddf.end + "'\n  ";
  const _0x23d8c2 = AdsApp.search(_0x21e026);
  const _0x180d94 = _0x23d8c2.hasNext();
  const _0x5b5cec = _0x180d94 ? buildAudienceNameMap() : {};
  let _0xf5d386 = _0x180d94 ? _0x23d8c2.next() : null;
  while (_0xf5d386) {
    const _0x2f2210 = String(_0xf5d386.adGroupCriterion.criterionId);
    const _0x5e2c8e = (_0xf5d386.adGroupCriterion.displayName || '').trim();
    const _0x58437d = _0xf5d386.adGroupCriterion.type || '';
    const _0x297f8f = _0x5b5cec[_0x2f2210] || null;
    const _0x2aa8d9 = _0x5e2c8e !== '' ? _0x5e2c8e : _0x297f8f ? _0x297f8f.name : null;
    const _0x62872f = _0x297f8f ? _0x297f8f.type : _0x58437d || null;
    _0x14f2b3.push({
      'source': "google_ads",
      'segment': "audience",
      'date': _0xf5d386.segments.date,
      'account': {
        'id': String(_0xf5d386.customer.id),
        'name': _0xf5d386.customer.descriptiveName
      },
      'campaign': {
        'id': String(_0xf5d386.campaign.id),
        'name': _0xf5d386.campaign.name
      },
      'ad_group': {
        'id': String(_0xf5d386.adGroup.id),
        'name': _0xf5d386.adGroup.name
      },
      'audience': {
        'criterion_id': _0x2f2210,
        'type': _0x58437d,
        'name': _0x2aa8d9,
        'resolved_type': _0x62872f
      },
      'metrics': buildMetrics(_0xf5d386.metrics),
      'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
    });
    _0xf5d386 = _0x23d8c2.hasNext() ? _0x23d8c2.next() : null;
  }
  Logger.log("[audience] " + _0x14f2b3.length + " registros");
  flushSegment(_0x14f2b3);
}
function fetchKeywordData(_0x1f7012) {
  const _0x4f23a7 = [];
  const _0x428ae6 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      ad_group.id, ad_group.name,\n      ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,\n      ad_group_criterion.quality_info.quality_score,\n      ad_group_criterion.status, ad_group_criterion.effective_cpc_bid_micros,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value,\n      metrics.all_conversions, metrics.all_conversions_value,\n      metrics.search_impression_share,\n      metrics.top_impression_percentage,\n      metrics.absolute_top_impression_percentage,\n      metrics.average_cpc,\n      segments.date\n    FROM keyword_view\n    WHERE segments.date BETWEEN '" + _0x1f7012.start + "' AND '" + _0x1f7012.end + "'\n  ";
  const _0x387315 = AdsApp.search(_0x428ae6);
  while (_0x387315.hasNext()) {
    const _0x46232c = _0x387315.next();
    _0x4f23a7.push({
      'source': "google_ads",
      'segment': "keyword",
      'date': _0x46232c.segments.date,
      'account': {
        'id': String(_0x46232c.customer.id),
        'name': _0x46232c.customer.descriptiveName
      },
      'campaign': {
        'id': String(_0x46232c.campaign.id),
        'name': _0x46232c.campaign.name
      },
      'ad_group': {
        'id': String(_0x46232c.adGroup.id),
        'name': _0x46232c.adGroup.name
      },
      'keyword': {
        'criterion_id': String(_0x46232c.adGroupCriterion.criterionId),
        'text': _0x46232c.adGroupCriterion.keyword.text,
        'match_type': _0x46232c.adGroupCriterion.keyword.matchType,
        'status': _0x46232c.adGroupCriterion.status,
        'quality_score': _0x46232c.adGroupCriterion.qualityInfo?.["qualityScore"] || null,
        'effective_cpc': microsToCurrency(_0x46232c.adGroupCriterion.effectiveCpcBidMicros) || null
      },
      'metrics': buildMetrics(_0x46232c.metrics),
      'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
    });
  }
  Logger.log("[keyword] " + _0x4f23a7.length + " registros");
  flushSegment(_0x4f23a7);
}
function fetchDeviceData(_0x4e8dba) {
  const _0x203867 = [];
  const _0x2a27a0 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      ad_group.id, ad_group.name,\n      segments.device,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value,\n      metrics.all_conversions, metrics.all_conversions_value, metrics.average_cpc,\n      metrics.top_impression_percentage, metrics.absolute_top_impression_percentage,\n      segments.date\n    FROM ad_group\n    WHERE segments.date BETWEEN '" + _0x4e8dba.start + "' AND '" + _0x4e8dba.end + "'\n  ";
  try {
    const _0x1c81c0 = AdsApp.search(_0x2a27a0);
    while (_0x1c81c0.hasNext()) {
      const _0x4766ea = _0x1c81c0.next();
      _0x203867.push({
        'source': "google_ads",
        'segment': "device",
        'date': _0x4766ea.segments.date,
        'account': {
          'id': String(_0x4766ea.customer.id),
          'name': _0x4766ea.customer.descriptiveName
        },
        'campaign': {
          'id': String(_0x4766ea.campaign.id),
          'name': _0x4766ea.campaign.name
        },
        'ad_group': {
          'id': String(_0x4766ea.adGroup.id),
          'name': _0x4766ea.adGroup.name
        },
        'device': _0x4766ea.segments.device,
        'metrics': buildMetrics(_0x4766ea.metrics),
        'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
      });
    }
  } catch (_0x394f50) {
    logErr("device", "erro: " + _0x394f50.message);
    return;
  }
  Logger.log("[device] " + _0x203867.length + " registros");
  flushSegment(_0x203867);
}
function fetchAdData(_0x4dfed8) {
  const _0x614070 = [];
  const _0x2d195e = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      ad_group.id, ad_group.name,\n      ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group_ad.ad.final_urls,\n      ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions,\n      ad_group_ad.status, ad_group_ad.ad_strength,\n      ad_group_ad.policy_summary.approval_status,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value, metrics.all_conversions, metrics.average_cpc,\n      segments.date\n    FROM ad_group_ad\n    WHERE segments.date BETWEEN '" + _0x4dfed8.start + "' AND '" + _0x4dfed8.end + "'\n      AND ad_group_ad.status != 'REMOVED'\n  ";
  const _0x3a94f1 = AdsApp.search(_0x2d195e);
  while (_0x3a94f1.hasNext()) {
    const _0x449c42 = _0x3a94f1.next();
    const _0x227f34 = _0x449c42.adGroupAd.ad;
    const _0x4c045a = {
      'source': "google_ads",
      'segment': 'ad',
      'date': _0x449c42.segments.date,
      'account': {
        'id': String(_0x449c42.customer.id),
        'name': _0x449c42.customer.descriptiveName
      },
      'campaign': {
        'id': String(_0x449c42.campaign.id),
        'name': _0x449c42.campaign.name
      },
      'ad_group': {
        'id': String(_0x449c42.adGroup.id),
        'name': _0x449c42.adGroup.name
      },
      'ad': removeNulls({
        'id': String(_0x227f34.id),
        'name': _0x227f34.name || null,
        'type': _0x227f34.type,
        'status': _0x449c42.adGroupAd.status,
        'ad_strength': _0x449c42.adGroupAd.adStrength || null,
        'approval_status': _0x449c42.adGroupAd.policySummary?.["approvalStatus"] || null,
        'final_urls': _0x227f34.finalUrls || [],
        'rsa_headlines': _0x227f34.responsiveSearchAd?.["headlines"] || null,
        'rsa_descriptions': _0x227f34.responsiveSearchAd?.["descriptions"] || null
      }),
      'metrics': buildMetrics(_0x449c42.metrics),
      'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
    };
    _0x614070.push(_0x4c045a);
  }
  Logger.log("[ad] " + _0x614070.length + " registros");
  flushSegment(_0x614070);
}
function fetchHourData(_0x133aff) {
  const _0x5a1061 = [];
  const _0x159be7 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      ad_group.id, ad_group.name,\n      segments.hour, segments.device,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value,\n      segments.date\n    FROM ad_group\n    WHERE segments.date BETWEEN '" + _0x133aff.start + "' AND '" + _0x133aff.end + "'\n  ";
  const _0x48666f = AdsApp.search(_0x159be7);
  while (_0x48666f.hasNext()) {
    const _0x2a8fd1 = _0x48666f.next();
    _0x5a1061.push({
      'source': "google_ads",
      'segment': "hour_of_day",
      'date': _0x2a8fd1.segments.date,
      'account': {
        'id': String(_0x2a8fd1.customer.id),
        'name': _0x2a8fd1.customer.descriptiveName
      },
      'campaign': {
        'id': String(_0x2a8fd1.campaign.id),
        'name': _0x2a8fd1.campaign.name
      },
      'ad_group': {
        'id': String(_0x2a8fd1.adGroup.id),
        'name': _0x2a8fd1.adGroup.name
      },
      'hour': _0x2a8fd1.segments.hour,
      'device': _0x2a8fd1.segments.device,
      'metrics': buildMetrics(_0x2a8fd1.metrics),
      'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
    });
  }
  Logger.log("[hour] " + _0x5a1061.length + " registros");
  flushSegment(_0x5a1061);
}
function fetchDayOfWeekData(_0x595a47) {
  const _0x381c19 = [];
  const _0x9d7684 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      ad_group.id, ad_group.name,\n      segments.day_of_week,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value,\n      segments.date\n    FROM ad_group\n    WHERE segments.date BETWEEN '" + _0x595a47.start + "' AND '" + _0x595a47.end + "'\n  ";
  const _0x49eb1e = AdsApp.search(_0x9d7684);
  while (_0x49eb1e.hasNext()) {
    const _0x1b8ba9 = _0x49eb1e.next();
    _0x381c19.push({
      'source': "google_ads",
      'segment': "day_of_week",
      'date': _0x1b8ba9.segments.date,
      'account': {
        'id': String(_0x1b8ba9.customer.id),
        'name': _0x1b8ba9.customer.descriptiveName
      },
      'campaign': {
        'id': String(_0x1b8ba9.campaign.id),
        'name': _0x1b8ba9.campaign.name
      },
      'ad_group': {
        'id': String(_0x1b8ba9.adGroup.id),
        'name': _0x1b8ba9.adGroup.name
      },
      'day_of_week': _0x1b8ba9.segments.dayOfWeek,
      'metrics': buildMetrics(_0x1b8ba9.metrics),
      'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
    });
  }
  Logger.log("[day_of_week] " + _0x381c19.length + " registros");
  flushSegment(_0x381c19);
}
function buildGeoNameMap(_0x56a870) {
  const _0xef7f80 = {};
  const _0x36cc9a = Object.keys(_0x56a870);
  if (_0x36cc9a.length === 0x0) {
    return _0xef7f80;
  }
  for (let _0x2ea6c3 = 0x0; _0x2ea6c3 < _0x36cc9a.length; _0x2ea6c3 += 0xc8) {
    const _0x682791 = _0x36cc9a.slice(_0x2ea6c3, _0x2ea6c3 + 0xc8).join(", ");
    try {
      const _0x462904 = AdsApp.search("\n        SELECT geo_target_constant.id, geo_target_constant.name,\n               geo_target_constant.country_code, geo_target_constant.target_type,\n               geo_target_constant.canonical_name\n        FROM geo_target_constant\n        WHERE geo_target_constant.id IN (" + _0x682791 + ")\n      ");
      while (_0x462904.hasNext()) {
        const _0x2ec610 = _0x462904.next().geoTargetConstant;
        _0xef7f80[String(_0x2ec610.id)] = {
          'name': _0x2ec610.name || null,
          'country_code': _0x2ec610.countryCode || null,
          'target_type': _0x2ec610.targetType || null,
          'canonical_name': _0x2ec610.canonicalName || null
        };
      }
    } catch (_0x294192) {
      logErr("geo_map", "erro: " + _0x294192.message);
    }
  }
  Logger.log("[geo_map] " + Object.keys(_0xef7f80).length + " localizações resolvidas");
  return _0xef7f80;
}
function fetchLocationData(_0x47361a) {
  const _0x1197a2 = [];
  const _0x21ba63 = {};
  const _0x12cfcc = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      geographic_view.country_criterion_id, geographic_view.location_type,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value,\n      metrics.all_conversions, metrics.all_conversions_value,\n      segments.date\n    FROM geographic_view\n    WHERE segments.date BETWEEN '" + _0x47361a.start + "' AND '" + _0x47361a.end + "'\n  ";
  try {
    const _0x732cc7 = AdsApp.search(_0x12cfcc);
    while (_0x732cc7.hasNext()) {
      const _0x391a86 = _0x732cc7.next();
      const _0x58d6af = _0x391a86.geographicView.countryCriterionId ? String(_0x391a86.geographicView.countryCriterionId) : '';
      if (_0x58d6af) {
        _0x21ba63[_0x58d6af] = true;
      }
      _0x1197a2.push(_0x391a86);
    }
  } catch (_0x155db7) {
    logErr("location", "erro: " + _0x155db7.message);
    return;
  }
  const _0x49e5b7 = buildGeoNameMap(_0x21ba63);
  const _0x41bf00 = _0x1197a2.map(function (_0x15512a) {
    const _0x25e751 = _0x15512a.geographicView.countryCriterionId ? String(_0x15512a.geographicView.countryCriterionId) : null;
    const _0x40fe70 = _0x25e751 ? _0x49e5b7[_0x25e751] || null : null;
    return {
      'source': "google_ads",
      'segment': "location",
      'date': _0x15512a.segments.date,
      'account': {
        'id': String(_0x15512a.customer.id),
        'name': _0x15512a.customer.descriptiveName
      },
      'campaign': {
        'id': String(_0x15512a.campaign.id),
        'name': _0x15512a.campaign.name
      },
      'location': {
        'country_criterion_id': _0x25e751,
        'location_type': _0x15512a.geographicView.locationType || null,
        'name': _0x40fe70 ? _0x40fe70.name : null,
        'country_code': _0x40fe70 ? _0x40fe70.country_code : null,
        'target_type': _0x40fe70 ? _0x40fe70.target_type : null,
        'canonical_name': _0x40fe70 ? _0x40fe70.canonical_name : null
      },
      'metrics': buildMetrics(_0x15512a.metrics),
      'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
    };
  });
  Logger.log("[location] " + _0x41bf00.length + " registros");
  flushSegment(_0x41bf00);
}
function fetchPlacementData(_0x39809f) {
  const _0x185a88 = [];
  const _0x177444 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      ad_group.id, ad_group.name,\n      detail_placement_view.display_name, detail_placement_view.group_placement_target_url,\n      detail_placement_view.placement, detail_placement_view.placement_type, detail_placement_view.target_url,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value, metrics.view_through_conversions,\n      segments.date\n    FROM detail_placement_view\n    WHERE segments.date BETWEEN '" + _0x39809f.start + "' AND '" + _0x39809f.end + "'\n  ";
  try {
    const _0x55afd6 = AdsApp.search(_0x177444);
    while (_0x55afd6.hasNext()) {
      const _0x5334c5 = _0x55afd6.next();
      const _0x51a9c1 = _0x5334c5.detailPlacementView;
      _0x185a88.push({
        'source': "google_ads",
        'segment': "placement",
        'date': _0x5334c5.segments.date,
        'account': {
          'id': String(_0x5334c5.customer.id),
          'name': _0x5334c5.customer.descriptiveName
        },
        'campaign': {
          'id': String(_0x5334c5.campaign.id),
          'name': _0x5334c5.campaign.name
        },
        'ad_group': {
          'id': String(_0x5334c5.adGroup.id),
          'name': _0x5334c5.adGroup.name
        },
        'placement': {
          'name': _0x51a9c1.displayName || null,
          'url': _0x51a9c1.targetUrl || null,
          'group_url': _0x51a9c1.groupPlacementTargetUrl || null,
          'placement_id': _0x51a9c1.placement || null,
          'type': _0x51a9c1.placementType || null
        },
        'metrics': buildMetrics(_0x5334c5.metrics),
        'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
      });
    }
  } catch (_0x363d1f) {
    logErr("placement", "não disponível: " + _0x363d1f.message);
  }
  Logger.log("[placement] " + _0x185a88.length + " registros");
  flushSegment(_0x185a88);
}
function fetchSearchTermData(_0x5ea5d1) {
  const _0x183023 = [];
  const _0x1cb640 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      ad_group.id, ad_group.name,\n      search_term_view.search_term, search_term_view.status,\n      segments.search_term_match_type,\n      segments.search_term_match_source,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value,\n      metrics.all_conversions, metrics.all_conversions_value, metrics.average_cpc,\n      metrics.top_impression_percentage,\n      metrics.absolute_top_impression_percentage,\n      segments.date\n    FROM search_term_view\n    WHERE segments.date BETWEEN '" + _0x5ea5d1.start + "' AND '" + _0x5ea5d1.end + "'\n  ";
  try {
    const _0x317d5f = AdsApp.search(_0x1cb640);
    while (_0x317d5f.hasNext()) {
      const _0x39045c = _0x317d5f.next();
      _0x183023.push({
        'source': "google_ads",
        'segment': "search_term",
        'date': _0x39045c.segments.date,
        'account': {
          'id': String(_0x39045c.customer.id),
          'name': _0x39045c.customer.descriptiveName
        },
        'campaign': {
          'id': String(_0x39045c.campaign.id),
          'name': _0x39045c.campaign.name
        },
        'ad_group': {
          'id': String(_0x39045c.adGroup.id),
          'name': _0x39045c.adGroup.name
        },
        'search_term': {
          'term': _0x39045c.searchTermView.searchTerm,
          'status': _0x39045c.searchTermView.status,
          'match_type': _0x39045c.segments.searchTermMatchType,
          'match_source': _0x39045c.segments.searchTermMatchSource || ''
        },
        'metrics': buildMetrics(_0x39045c.metrics),
        'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
      });
    }
  } catch (_0x26efd4) {
    logErr("search_term", "não disponível: " + _0x26efd4.message);
  }
  Logger.log("[search_term] " + _0x183023.length + " registros");
  flushSegment(_0x183023);
}
function fetchAssetData(_0x8fdb8f) {
  const _0x25d056 = [];
  const _0x47bbc3 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      asset.id, asset.name, asset.type,\n      asset.text_asset.text, asset.image_asset.full_size.url,\n      asset.sitelink_asset.link_text, asset.sitelink_asset.description1, asset.sitelink_asset.description2,\n      asset.callout_asset.callout_text,\n      asset.call_asset.phone_number, asset.call_asset.country_code,\n      asset.structured_snippet_asset.header, asset.structured_snippet_asset.values,\n      asset.promotion_asset.promotion_target, asset.promotion_asset.discount_modifier,\n      asset.lead_form_asset.headline,\n      campaign_asset.field_type, campaign_asset.status,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      segments.date\n    FROM campaign_asset\n    WHERE segments.date BETWEEN '" + _0x8fdb8f.start + "' AND '" + _0x8fdb8f.end + "'\n  ";
  try {
    const _0x57c9ee = AdsApp.search(_0x47bbc3);
    while (_0x57c9ee.hasNext()) {
      const _0x48f746 = _0x57c9ee.next();
      const _0x1a1257 = _0x48f746.asset;
      _0x25d056.push({
        'source': "google_ads",
        'segment': "asset",
        'date': _0x48f746.segments.date,
        'account': {
          'id': String(_0x48f746.customer.id),
          'name': _0x48f746.customer.descriptiveName
        },
        'campaign': {
          'id': String(_0x48f746.campaign.id),
          'name': _0x48f746.campaign.name
        },
        'asset': removeNulls({
          'id': String(_0x1a1257.id),
          'name': _0x1a1257.name || null,
          'type': _0x1a1257.type,
          'field_type': _0x48f746.campaignAsset.fieldType || null,
          'status': _0x48f746.campaignAsset.status || null,
          'text': _0x1a1257.textAsset?.["text"] || null,
          'sitelink_text': _0x1a1257.sitelinkAsset?.["linkText"] || null,
          'sitelink_desc1': _0x1a1257.sitelinkAsset?.["description1"] || null,
          'sitelink_desc2': _0x1a1257.sitelinkAsset?.["description2"] || null,
          'callout_text': _0x1a1257.calloutAsset?.["calloutText"] || null,
          'call_phone': _0x1a1257.callAsset?.["phoneNumber"] || null,
          'call_country': _0x1a1257.callAsset?.["countryCode"] || null,
          'snippet_header': _0x1a1257.structuredSnippetAsset?.["header"] || null,
          'snippet_values': _0x1a1257.structuredSnippetAsset?.["values"] || null,
          'promo_target': _0x1a1257.promotionAsset?.["promotionTarget"] || null,
          'promo_discount_modifier': _0x1a1257.promotionAsset?.["discountModifier"] || null,
          'lead_form_headline': _0x1a1257.leadFormAsset?.["headline"] || null,
          'image_url': _0x1a1257.imageAsset?.["fullSize"]?.["url"] || null
        }),
        'metrics': buildMetrics(_0x48f746.metrics),
        'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
      });
    }
  } catch (_0x4cb190) {
    logErr("asset", "não disponível: " + _0x4cb190.message);
  }
  Logger.log("[asset] " + _0x25d056.length + " registros");
  flushSegment(_0x25d056);
}
function fetchLabelData(_0x2e8422) {
  const _0x484af2 = [];
  const _0x449d46 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name, campaign.labels,\n      ad_group.id, ad_group.name, ad_group.labels,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value,\n      segments.date\n    FROM ad_group\n    WHERE segments.date BETWEEN '" + _0x2e8422.start + "' AND '" + _0x2e8422.end + "'\n  ";
  const _0x28604f = AdsApp.search(_0x449d46);
  while (_0x28604f.hasNext()) {
    const _0x2e6960 = _0x28604f.next();
    const _0x553c1e = _0x2e6960.campaign.labels || [];
    const _0x32266a = _0x2e6960.adGroup.labels || [];
    if (_0x553c1e.length === 0x0 && _0x32266a.length === 0x0) {
      continue;
    }
    _0x484af2.push({
      'source': "google_ads",
      'segment': "labels",
      'date': _0x2e6960.segments.date,
      'account': {
        'id': String(_0x2e6960.customer.id),
        'name': _0x2e6960.customer.descriptiveName
      },
      'campaign': {
        'id': String(_0x2e6960.campaign.id),
        'name': _0x2e6960.campaign.name,
        'labels': _0x553c1e
      },
      'ad_group': {
        'id': String(_0x2e6960.adGroup.id),
        'name': _0x2e6960.adGroup.name,
        'labels': _0x32266a
      },
      'metrics': buildMetrics(_0x2e6960.metrics),
      'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
    });
  }
  Logger.log("[labels] " + _0x484af2.length + " registros");
  flushSegment(_0x484af2);
}
function fetchVideoData(_0x535a48) {
  const _0x210361 = [];
  const _0x158317 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name, campaign.advertising_channel_type,\n      ad_group.id, ad_group.name,\n      video.id, video.title, video.duration_millis, video.channel_id,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value, metrics.all_conversions,\n      segments.date\n    FROM video\n    WHERE segments.date BETWEEN '" + _0x535a48.start + "' AND '" + _0x535a48.end + "'\n  ";
  try {
    const _0x599b50 = AdsApp.search(_0x158317);
    while (_0x599b50.hasNext()) {
      const _0x591d34 = _0x599b50.next();
      _0x210361.push({
        'source': "google_ads",
        'segment': "video",
        'date': _0x591d34.segments.date,
        'account': {
          'id': String(_0x591d34.customer.id),
          'name': _0x591d34.customer.descriptiveName
        },
        'campaign': {
          'id': String(_0x591d34.campaign.id),
          'name': _0x591d34.campaign.name,
          'channel_type': _0x591d34.campaign.advertisingChannelType
        },
        'ad_group': {
          'id': String(_0x591d34.adGroup.id),
          'name': _0x591d34.adGroup.name
        },
        'video': {
          'id': String(_0x591d34.video.id),
          'title': _0x591d34.video.title || null,
          'duration_seconds': _0x591d34.video.durationMillis ? Math.round(_0x591d34.video.durationMillis / 0x3e8) : null,
          'channel_id': _0x591d34.video.channelId || null
        },
        'metrics': buildMetrics(_0x591d34.metrics),
        'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
      });
    }
  } catch (_0x1132a8) {
    logErr("video", "erro: " + _0x1132a8.message);
  }
  Logger.log("[video] " + _0x210361.length + " registros");
  flushSegment(_0x210361);
}
function fetchPMaxAssetGroupData(_0x49046d) {
  const _0x43bfe1 = [];
  const _0x42115e = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      asset_group.id, asset_group.name, asset_group.status, asset_group.ad_strength,\n      asset_group.final_urls, asset_group.final_mobile_urls,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value,\n      metrics.all_conversions, metrics.all_conversions_value,\n      segments.date\n    FROM asset_group\n    WHERE segments.date BETWEEN '" + _0x49046d.start + "' AND '" + _0x49046d.end + "'\n      AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'\n  ";
  try {
    const _0x10442e = AdsApp.search(_0x42115e);
    while (_0x10442e.hasNext()) {
      const _0x10ce32 = _0x10442e.next();
      _0x43bfe1.push({
        'source': "google_ads",
        'segment': "pmax_asset_group",
        'date': _0x10ce32.segments.date,
        'account': {
          'id': String(_0x10ce32.customer.id),
          'name': _0x10ce32.customer.descriptiveName
        },
        'campaign': {
          'id': String(_0x10ce32.campaign.id),
          'name': _0x10ce32.campaign.name
        },
        'asset_group': {
          'id': String(_0x10ce32.assetGroup.id),
          'name': _0x10ce32.assetGroup.name,
          'status': _0x10ce32.assetGroup.status,
          'ad_strength': _0x10ce32.assetGroup.adStrength || null,
          'final_urls': _0x10ce32.assetGroup.finalUrls || [],
          'final_mobile_urls': _0x10ce32.assetGroup.finalMobileUrls || []
        },
        'metrics': buildMetrics(_0x10ce32.metrics),
        'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
      });
    }
  } catch (_0x2a016f) {
    logErr("pmax_asset_group", "erro: " + _0x2a016f.message);
  }
  Logger.log("[pmax_asset_group] " + _0x43bfe1.length + " registros");
  flushSegment(_0x43bfe1);
}
function fetchPMaxAssetPerformanceData(_0xa41801) {
  const _0x5ea1a6 = [];
  const _0x5850ef = _0xa41801.end;
  try {
    const _0x174d94 = AdsApp.search("\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name,\n      asset_group.id, asset_group.name,\n      asset_group_asset.field_type, asset_group_asset.status,\n      asset.id, asset.name, asset.type,\n      asset.text_asset.text, asset.image_asset.full_size.url\n    FROM asset_group_asset\n    WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'\n      AND asset_group_asset.status != 'REMOVED'\n  ");
    while (_0x174d94.hasNext()) {
      const _0xe0e267 = _0x174d94.next();
      const _0x407ea9 = _0xe0e267.asset;
      _0x5ea1a6.push({
        'source': "google_ads",
        'segment': "pmax_asset",
        'date': _0x5850ef,
        'account': {
          'id': String(_0xe0e267.customer.id),
          'name': _0xe0e267.customer.descriptiveName
        },
        'campaign': {
          'id': String(_0xe0e267.campaign.id),
          'name': _0xe0e267.campaign.name
        },
        'asset_group': {
          'id': String(_0xe0e267.assetGroup.id),
          'name': _0xe0e267.assetGroup.name
        },
        'asset': removeNulls({
          'id': String(_0x407ea9.id),
          'name': _0x407ea9.name || null,
          'type': _0x407ea9.type,
          'field_type': _0xe0e267.assetGroupAsset.fieldType,
          'status': _0xe0e267.assetGroupAsset.status,
          'text': _0x407ea9.textAsset?.["text"] || null,
          'image_url': _0x407ea9.imageAsset?.["fullSize"]?.["url"] || null
        }),
        'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
      });
    }
  } catch (_0x18598a) {
    logErr("pmax_asset", "erro: " + _0x18598a.message);
  }
  Logger.log("[pmax_asset] " + _0x5ea1a6.length + " registros");
  flushSegment(_0x5ea1a6);
}
function fetchDisplayCreativeData(_0x184bff) {
  const _0xe4e276 = [];
  const _0x225ead = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name, campaign.advertising_channel_type,\n      ad_group.id, ad_group.name,\n      ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group_ad.ad.final_urls,\n      ad_group_ad.ad.image_ad.image_url, ad_group_ad.ad.image_ad.name,\n      ad_group_ad.ad.image_ad.mime_type, ad_group_ad.ad.image_ad.pixel_width, ad_group_ad.ad.image_ad.pixel_height,\n      ad_group_ad.ad.responsive_display_ad.headlines, ad_group_ad.ad.responsive_display_ad.descriptions,\n      ad_group_ad.ad.responsive_display_ad.long_headline, ad_group_ad.ad.responsive_display_ad.business_name,\n      ad_group_ad.ad.responsive_display_ad.marketing_images, ad_group_ad.ad.responsive_display_ad.square_marketing_images,\n      ad_group_ad.ad.responsive_display_ad.logo_images, ad_group_ad.ad.responsive_display_ad.youtube_videos,\n      ad_group_ad.ad.responsive_display_ad.accent_color, ad_group_ad.ad.responsive_display_ad.main_color,\n      ad_group_ad.status, ad_group_ad.ad_strength,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value, metrics.all_conversions,\n      metrics.active_view_impressions, metrics.active_view_measurability, metrics.active_view_viewability,\n      segments.date\n    FROM ad_group_ad\n    WHERE segments.date BETWEEN '" + _0x184bff.start + "' AND '" + _0x184bff.end + "'\n      AND campaign.advertising_channel_type IN ('DISPLAY', 'PERFORMANCE_MAX')\n      AND ad_group_ad.status != 'REMOVED'\n  ";
  try {
    const _0x501d1a = AdsApp.search(_0x225ead);
    while (_0x501d1a.hasNext()) {
      const _0x19efda = _0x501d1a.next();
      const _0x5be1cb = _0x19efda.adGroupAd.ad;
      _0xe4e276.push({
        'source': "google_ads",
        'segment': "display_creative",
        'date': _0x19efda.segments.date,
        'account': {
          'id': String(_0x19efda.customer.id),
          'name': _0x19efda.customer.descriptiveName
        },
        'campaign': {
          'id': String(_0x19efda.campaign.id),
          'name': _0x19efda.campaign.name,
          'channel_type': _0x19efda.campaign.advertisingChannelType
        },
        'ad_group': {
          'id': String(_0x19efda.adGroup.id),
          'name': _0x19efda.adGroup.name
        },
        'creative': removeNulls({
          'id': String(_0x5be1cb.id),
          'name': _0x5be1cb.name || null,
          'type': _0x5be1cb.type,
          'status': _0x19efda.adGroupAd.status,
          'ad_strength': _0x19efda.adGroupAd.adStrength || null,
          'final_urls': _0x5be1cb.finalUrls || [],
          'image_url': _0x5be1cb.imageAd?.["imageUrl"] || null,
          'image_name': _0x5be1cb.imageAd?.["name"] || null,
          'image_mime': _0x5be1cb.imageAd?.["mimeType"] || null,
          'image_width': _0x5be1cb.imageAd?.["pixelWidth"] || null,
          'image_height': _0x5be1cb.imageAd?.["pixelHeight"] || null,
          'rda_headlines': _0x5be1cb.responsiveDisplayAd?.["headlines"] || null,
          'rda_descriptions': _0x5be1cb.responsiveDisplayAd?.["descriptions"] || null,
          'rda_long_headline': _0x5be1cb.responsiveDisplayAd?.["longHeadline"] || null,
          'rda_business_name': _0x5be1cb.responsiveDisplayAd?.["businessName"] || null,
          'rda_marketing_images': _0x5be1cb.responsiveDisplayAd?.["marketingImages"] || null,
          'rda_square_images': _0x5be1cb.responsiveDisplayAd?.["squareMarketingImages"] || null,
          'rda_logo_images': _0x5be1cb.responsiveDisplayAd?.["logoImages"] || null,
          'rda_youtube_videos': _0x5be1cb.responsiveDisplayAd?.["youtubeVideos"] || null,
          'rda_accent_color': _0x5be1cb.responsiveDisplayAd?.["accentColor"] || null,
          'rda_main_color': _0x5be1cb.responsiveDisplayAd?.["mainColor"] || null
        }),
        'metrics': buildMetrics(_0x19efda.metrics),
        'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
      });
    }
  } catch (_0xf181e9) {
    logErr("display_creative", "erro: " + _0xf181e9.message);
  }
  Logger.log("[display_creative] " + _0xe4e276.length + " registros");
  flushSegment(_0xe4e276);
}
function buildAssetVideoMap() {
  const _0x39cc96 = {};
  try {
    const _0x3fc98b = AdsApp.search("\n      SELECT asset.id, asset.name,\n             asset.youtube_video_asset.youtube_video_id,\n             asset.youtube_video_asset.youtube_video_title\n      FROM asset WHERE asset.type = 'YOUTUBE_VIDEO'\n    ");
    while (_0x3fc98b.hasNext()) {
      const _0x13f992 = _0x3fc98b.next();
      _0x39cc96[String(_0x13f992.asset.id)] = {
        'youtube_video_id': _0x13f992.asset.youtubeVideoAsset?.["youtubeVideoId"] || null,
        'youtube_video_title': _0x13f992.asset.youtubeVideoAsset?.["youtubeVideoTitle"] || null
      };
    }
  } catch (_0x2e2a5d) {
    logErr("asset_video_map", "erro: " + _0x2e2a5d.message);
  }
  return _0x39cc96;
}
function fetchDemandGenCreativeData(_0x25158c) {
  const _0x5ef55b = [];
  const _0x4590be = buildAssetVideoMap();
  const _0x317343 = "\n    SELECT\n      customer.id, customer.descriptive_name,\n      campaign.id, campaign.name, campaign.advertising_channel_type,\n      ad_group.id, ad_group.name,\n      ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group_ad.ad.final_urls,\n      ad_group_ad.ad.demand_gen_video_responsive_ad.headlines,\n      ad_group_ad.ad.demand_gen_video_responsive_ad.long_headlines,\n      ad_group_ad.ad.demand_gen_video_responsive_ad.descriptions,\n      ad_group_ad.ad.demand_gen_video_responsive_ad.videos,\n      ad_group_ad.ad.demand_gen_video_responsive_ad.logo_images,\n      ad_group_ad.ad.demand_gen_video_responsive_ad.business_name,\n      ad_group_ad.ad.demand_gen_multi_asset_ad.headlines,\n      ad_group_ad.ad.demand_gen_multi_asset_ad.descriptions,\n      ad_group_ad.ad.demand_gen_multi_asset_ad.marketing_images,\n      ad_group_ad.ad.demand_gen_multi_asset_ad.square_marketing_images,\n      ad_group_ad.ad.demand_gen_multi_asset_ad.portrait_marketing_images,\n      ad_group_ad.ad.demand_gen_multi_asset_ad.logo_images,\n      ad_group_ad.ad.demand_gen_multi_asset_ad.business_name,\n      ad_group_ad.status, ad_group_ad.ad_strength, ad_group_ad.policy_summary.approval_status,\n      metrics.impressions, metrics.clicks, metrics.cost_micros,\n      metrics.conversions, metrics.conversions_value, metrics.all_conversions,\n      metrics.engagements, metrics.engagement_rate,\n      metrics.interactions, metrics.interaction_rate,\n      metrics.active_view_impressions, metrics.active_view_measurability, metrics.active_view_viewability,\n      segments.date\n    FROM ad_group_ad\n    WHERE segments.date BETWEEN '" + _0x25158c.start + "' AND '" + _0x25158c.end + "'\n      AND campaign.advertising_channel_type = 'DEMAND_GEN'\n      AND ad_group_ad.status != 'REMOVED'\n  ";
  try {
    const _0x58c196 = AdsApp.search(_0x317343);
    while (_0x58c196.hasNext()) {
      const _0x2c0244 = _0x58c196.next();
      const _0xb31782 = _0x2c0244.adGroupAd.ad;
      const _0x48d957 = _0xb31782.demandGenVideoResponsiveAd || null;
      const _0x1bcfee = _0xb31782.demandGenMultiAssetAd || null;
      _0x5ef55b.push({
        'source': "google_ads",
        'segment': "demand_gen_creative",
        'date': _0x2c0244.segments.date,
        'account': {
          'id': String(_0x2c0244.customer.id),
          'name': _0x2c0244.customer.descriptiveName
        },
        'campaign': {
          'id': String(_0x2c0244.campaign.id),
          'name': _0x2c0244.campaign.name
        },
        'ad_group': {
          'id': String(_0x2c0244.adGroup.id),
          'name': _0x2c0244.adGroup.name
        },
        'creative': removeNulls({
          'id': String(_0xb31782.id),
          'name': _0xb31782.name || null,
          'type': _0xb31782.type,
          'status': _0x2c0244.adGroupAd.status,
          'ad_strength': _0x2c0244.adGroupAd.adStrength || null,
          'approval_status': _0x2c0244.adGroupAd.policySummary?.["approvalStatus"] || null,
          'final_urls': _0xb31782.finalUrls || [],
          'vra_headlines': _0x48d957?.["headlines"] || null,
          'vra_long_headlines': _0x48d957?.["longHeadlines"] || null,
          'vra_descriptions': _0x48d957?.["descriptions"] || null,
          'vra_videos': _0x48d957?.["videos"] ? _0x48d957.videos.map(function (_0x120b21) {
            const _0x214537 = _0x120b21.asset ? _0x120b21.asset.split('/').pop() : null;
            const _0x42f97e = _0x214537 ? _0x4590be[_0x214537] || null : null;
            return {
              'asset_id': _0x214537,
              'youtube_video_id': _0x42f97e ? _0x42f97e.youtube_video_id : null,
              'youtube_video_title': _0x42f97e ? _0x42f97e.youtube_video_title : null,
              'youtube_url': _0x42f97e && _0x42f97e.youtube_video_id ? "https://youtube.com/watch?v=" + _0x42f97e.youtube_video_id : null
            };
          }) : null,
          'vra_logo_images': _0x48d957?.["logoImages"] || null,
          'vra_business_name': _0x48d957?.["businessName"] || null,
          'maa_headlines': _0x1bcfee?.["headlines"] || null,
          'maa_descriptions': _0x1bcfee?.["descriptions"] || null,
          'maa_marketing_images': _0x1bcfee?.["marketingImages"] || null,
          'maa_square_images': _0x1bcfee?.["squareMarketingImages"] || null,
          'maa_portrait_images': _0x1bcfee?.["portraitMarketingImages"] || null,
          'maa_logo_images': _0x1bcfee?.["logoImages"] || null,
          'maa_business_name': _0x1bcfee?.["businessName"] || null
        }),
        'metrics': buildMetrics(_0x2c0244.metrics),
        'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
      });
    }
  } catch (_0x5efe37) {
    logErr("demand_gen_creative", "erro: " + _0x5efe37.message);
  }
  Logger.log("[demand_gen_creative] " + _0x5ef55b.length + " registros");
  flushSegment(_0x5ef55b);
}
function buildMetrics(_0x31d99d, _0x4c0607) {
  _0x31d99d = _0x31d99d || {};
  _0x4c0607 = _0x4c0607 || {};
  const _0x571277 = Number(_0x31d99d.impressions) || 0x0;
  const _0x374c44 = Number(_0x31d99d.clicks) || 0x0;
  const _0x598af2 = {
    'impressions': _0x571277,
    'clicks': _0x374c44,
    'cost': microsToCurrency(_0x31d99d.costMicros),
    'conversions': Number(_0x31d99d.conversions) || 0x0,
    'conversion_value': Number(_0x31d99d.conversionsValue) || 0x0,
    'all_conversions': numOrNull(_0x31d99d.allConversions),
    'all_conversion_value': numOrNull(_0x31d99d.allConversionsValue),
    'view_through_conversions': intOrNull(_0x31d99d.viewThroughConversions),
    'cross_device_conversions': numOrNull(_0x31d99d.crossDeviceConversions),
    'average_cpc': _0x31d99d.averageCpc != null ? microsToCurrency(_0x31d99d.averageCpc) : null,
    'average_cpm': _0x31d99d.averageCpm != null ? microsToCurrency(_0x31d99d.averageCpm) : null,
    'ctr_percent': _0x571277 > 0x0 ? Number((_0x374c44 / _0x571277 * 0x64).toFixed(0x2)) : 0x0,
    'impression_share_percent': toPct(_0x31d99d.searchImpressionShare),
    'top_impression_share_percent': toPct(_0x31d99d.topImpressionPercentage),
    'absolute_top_impression_share_percent': toPct(_0x31d99d.absoluteTopImpressionPercentage),
    'search_rank_lost_is_percent': toPct(_0x31d99d.searchRankLostImpressionShare),
    'search_rank_lost_top_is_percent': toPct(_0x31d99d.searchRankLostTopImpressionShare),
    'search_rank_lost_abs_top_is_percent': toPct(_0x31d99d.searchRankLostAbsoluteTopImpressionShare),
    'search_budget_lost_is_percent': toPct(_0x31d99d.searchBudgetLostImpressionShare),
    'search_budget_lost_top_is_percent': toPct(_0x31d99d.searchBudgetLostTopImpressionShare),
    'search_budget_lost_abs_top_is_percent': toPct(_0x31d99d.searchBudgetLostAbsoluteTopImpressionShare),
    'search_eligible_top_is_percent': toPct(_0x31d99d.searchTopImpressionShare),
    'search_eligible_abs_top_is_percent': toPct(_0x31d99d.searchAbsoluteTopImpressionShare),
    'search_exact_match_is_percent': toPct(_0x31d99d.searchExactMatchImpressionShare),
    'search_click_share_percent': toPct(_0x31d99d.searchClickShare),
    'interactions': intOrNull(_0x31d99d.interactions),
    'interaction_rate_percent': toRate(_0x31d99d.interactionRate),
    'invalid_clicks': intOrNull(_0x31d99d.invalidClicks),
    'invalid_click_rate_percent': toRate(_0x31d99d.invalidClickRate),
    'average_cost': _0x31d99d.averageCost != null ? microsToCurrency(_0x31d99d.averageCost) : null,
    'engagements': intOrNull(_0x31d99d.engagements),
    'engagement_rate': toPct(_0x31d99d.engagementRate),
    'active_view_impressions': intOrNull(_0x31d99d.activeViewImpressions),
    'active_view_measurability': toPct(_0x31d99d.activeViewMeasurability),
    'active_view_viewability': toPct(_0x31d99d.activeViewViewability),
    'gmail_forwards': intOrNull(_0x31d99d.gmailForwards),
    'gmail_saves': intOrNull(_0x31d99d.gmailSaves),
    'gmail_secondary_clicks': intOrNull(_0x31d99d.gmailSecondaryClicks)
  };
  const _0xa95aea = _0x4c0607.checkout;
  if (_0xa95aea) {
    _0x598af2.checkout_conversions = _0xa95aea.checkout_conversions;
    _0x598af2.checkout_value = _0xa95aea.checkout_value;
  }
  return removeNulls(_0x598af2);
}
function flushSegment(_0x276b19) {
  if (!_0x276b19 || _0x276b19.length === 0x0) {
    return;
  }
  sendInBatches(_0x276b19, 0x1f4);
}
function sendInBatches(_0x5e3774, _0x59d569) {
  for (let _0x4aa0b5 = 0x0; _0x4aa0b5 < _0x5e3774.length; _0x4aa0b5 += _0x59d569) {
    const _0x5ec2a9 = _0x5e3774.slice(_0x4aa0b5, _0x4aa0b5 + _0x59d569);
    sendToApi(_0x5ec2a9);
  }
}
function sendToApi(_0xcd4b40) {
  const _0x1e8eb8 = {
    'Content-Type': "application/json"
  };
  const _0x1514c8 = {
    'method': "post",
    'contentType': "application/json",
    'muteHttpExceptions': true,
    'headers': _0x1e8eb8,
    'payload': JSON.stringify({
      'source': "google_ads",
      'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      'data': _0xcd4b40
    })
  };
  const _0xea2a8c = UrlFetchApp.fetch("{{API_BASE_URL}}/google-ads/import/{{USER_UUID}}", _0x1514c8);
  const _0x4e2366 = _0xea2a8c.getResponseCode();
  Logger.log("Status: " + _0x4e2366 + " | Batch: " + _0xcd4b40.length);
  if (_0x4e2366 >= 0x190) {
    logErr("send", "HTTP " + _0x4e2366 + " — " + _0xea2a8c.getContentText().slice(0x0, 0x12c));
  }
}
function reportRunToBackend(_0x94420a) {
  if (!RUN_ERRORS.length) {
    return;
  }
  try {
    const _0x4a8250 = "{{API_BASE_URL}}/google-ads/import/{{USER_UUID}}".replace("/google-ads/import/", "/google-ads/appscript/log/");
    let _0xf1d1af = null;
    try {
      _0xf1d1af = AdsApp.currentAccount().getCustomerId();
    } catch (_0x5e9d96) {}
    const _0x48e108 = RUN_ERRORS.some(function (_0x54d51d) {
      return _0x54d51d.scope === "fatal";
    });
    UrlFetchApp.fetch(_0x4a8250, {
      'method': "post",
      'contentType': "application/json",
      'muteHttpExceptions': true,
      'payload': JSON.stringify({
        'customer_id': _0xf1d1af,
        'status': _0x48e108 ? "client_fatal" : "client_error",
        'errors': RUN_ERRORS,
        'started_at': _0x94420a,
        'finished_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")
      })
    });
    Logger.log("[report] " + RUN_ERRORS.length + " erro(s) reportados ao backend");
  } catch (_0x4da4ec) {
    Logger.log("[report] falha ao reportar erros: " + _0x4da4ec.message);
  }
}
function debugPayload(_0x2b55dd) {
  Logger.log("===== DRY_RUN PAYLOAD (" + _0x2b55dd.length + " registros) =====");
  Logger.log(JSON.stringify({
    'source': "google_ads",
    'imported_at': Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    'data': _0x2b55dd
  }, null, 0x2).slice(0x0, 0x1f40));
  Logger.log("=========================");
}
function fetchRunConfig() {
  try {
    const _0x371331 = AdsApp.currentAccount().getCustomerId();
    const _0x5127d6 = "{{API_BASE_URL}}/google-ads/import/{{USER_UUID}}".replace("/google-ads/import/", "/google-ads/appscript/config/") + "?customer_id=" + encodeURIComponent(_0x371331);
    const _0x2e4a54 = UrlFetchApp.fetch(_0x5127d6, {
      'muteHttpExceptions': true
    });
    if (_0x2e4a54.getResponseCode() === 0xc8) {
      const _0x46d19d = JSON.parse(_0x2e4a54.getContentText());
      const _0x3ef637 = Number(_0x46d19d.days_back);
      Logger.log("[config] days_back=" + _0x3ef637 + " | 1ª importação=" + _0x46d19d.is_first_import);
      if (_0x3ef637 > 0x0) {
        return _0x3ef637;
      }
    } else {
      logErr("config", "HTTP " + _0x2e4a54.getResponseCode() + " — usando incremental (fallback)");
    }
  } catch (_0x279275) {
    logErr("config", "erro: " + _0x279275.message + " — usando incremental (fallback)");
  }
  return 0x7;
}
function getDateRange(_0x4c8def) {
  const _0x20c22b = new Date();
  const _0x4be1e6 = new Date();
  _0x4be1e6.setDate(_0x4be1e6.getDate() - _0x4c8def);
  return {
    'start': Utilities.formatDate(_0x4be1e6, accountTimeZone(), "yyyy-MM-dd"),
    'end': Utilities.formatDate(_0x20c22b, accountTimeZone(), "yyyy-MM-dd")
  };
}
let _accountTz = null;
function accountTimeZone() {
  if (_accountTz) {
    return _accountTz;
  }
  try {
    _accountTz = AdsApp.currentAccount().getTimeZone();
  } catch (_0x38e17a) {
    _accountTz = "GMT" || "GMT";
  }
  return _accountTz;
}
function formatDate(_0x5f5066) {
  return Utilities.formatDate(_0x5f5066, accountTimeZone(), "yyyy-MM-dd");
}
function nowIso() {
  return Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'");
}
function microsToCurrency(_0x5198f2) {
  if (!_0x5198f2) {
    return 0x0;
  }
  return Number((_0x5198f2 / 0xf4240).toFixed(0x2));
}
function round2(_0x268db4) {
  return Number(_0x268db4.toFixed(0x2));
}
function toPct(_0x11da34) {
  if (_0x11da34 == null) {
    return null;
  }
  return Number((Number(_0x11da34) * 0x64).toFixed(0x2));
}
function toRate(_0x5b15f3) {
  if (_0x5b15f3 == null) {
    return null;
  }
  return Number((Number(_0x5b15f3) * 0x64).toFixed(0x2));
}
function numOrNull(_0x3c2c98) {
  if (_0x3c2c98 == null) {
    return null;
  }
  const _0x336846 = Number(_0x3c2c98);
  return isNaN(_0x336846) ? null : _0x336846;
}
function intOrNull(_0x38f581) {
  if (_0x38f581 == null) {
    return null;
  }
  const _0x562096 = parseInt(_0x38f581, 0xa);
  return isNaN(_0x562096) ? null : _0x562096;
}
function removeNulls(_0x1438b8) {
  const _0x177aac = {};
  Object.keys(_0x1438b8).forEach(function (_0x315687) {
    if (_0x1438b8[_0x315687] !== null && _0x1438b8[_0x315687] !== undefined) {
      _0x177aac[_0x315687] = _0x1438b8[_0x315687];
    }
  });
  return _0x177aac;
}
powerScaleRun();