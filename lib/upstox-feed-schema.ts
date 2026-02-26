export const UPSTOX_PROTO_JSON = {
    "nested": {
        "com": {
            "nested": {
                "upstox": {
                    "nested": {
                        "marketdatafeeder": {
                            "nested": {
                                "rpc": {
                                    "nested": {
                                        "proto": {
                                            "nested": {
                                                "FeedResponse": {
                                                    "fields": {
                                                        "type": {
                                                            "type": "Type",
                                                            "id": 1
                                                        },
                                                        "feeds": {
                                                            "keyType": "string",
                                                            "type": "Feed",
                                                            "id": 2
                                                        }
                                                    },
                                                    "nested": {
                                                        "Type": {
                                                            "values": {
                                                                "initial_feed": 0,
                                                                "live_feed": 1
                                                            }
                                                        }
                                                    }
                                                },
                                                "Feed": {
                                                    "fields": {
                                                        "ltpc": {
                                                            "type": "LTPC",
                                                            "id": 1
                                                        },
                                                        "ff": {
                                                            "type": "FullFeed",
                                                            "id": 2
                                                        },
                                                        "oc": {
                                                            "type": "OptionChain",
                                                            "id": 3
                                                        }
                                                    }
                                                },
                                                "LTPC": {
                                                    "fields": {
                                                        "ltp": { "type": "double", "id": 1 },
                                                        "ltt": { "type": "int64", "id": 2 },
                                                        "lt": { "type": "int64", "id": 3 },
                                                        "cp": { "type": "double", "id": 4 },
                                                        "vol": { "type": "double", "id": 5 }
                                                    }
                                                },
                                                "FullFeed": {
                                                    "fields": {
                                                        "ltpc": { "type": "LTPC", "id": 1 },
                                                        "marketOHLC": { "type": "MarketOHLC", "id": 2 },
                                                        "marketDepth": { "type": "MarketDepth", "id": 3 }
                                                    }
                                                },
                                                "MarketOHLC": {
                                                    "fields": {
                                                        "ohlc": { "type": "OHLC", "id": 1 },
                                                        "averagePrice": { "type": "double", "id": 2 },
                                                        "yearHigh": { "type": "double", "id": 3 },
                                                        "yearLow": { "type": "double", "id": 4 }
                                                    }
                                                },
                                                "OHLC": {
                                                    "fields": {
                                                        "open": { "type": "double", "id": 1 },
                                                        "high": { "type": "double", "id": 2 },
                                                        "low": { "type": "double", "id": 3 },
                                                        "close": { "type": "double", "id": 4 },
                                                        "ts": { "type": "int64", "id": 5 },
                                                        "vol": { "type": "int64", "id": 6 }
                                                    }
                                                },
                                                "MarketDepth": {
                                                    "fields": {
                                                        "bids": { "rule": "repeated", "type": "DepthEntry", "id": 1 },
                                                        "asks": { "rule": "repeated", "type": "DepthEntry", "id": 2 }
                                                    }
                                                },
                                                "DepthEntry": {
                                                    "fields": {
                                                        "quantity": { "type": "int32", "id": 1 },
                                                        "price": { "type": "double", "id": 2 },
                                                        "orders": { "type": "int32", "id": 3 }
                                                    }
                                                },
                                                "OptionChain": {
                                                    "fields": {
                                                        "ltpc": { "type": "LTPC", "id": 1 },
                                                        "bidAskQuote": { "type": "BidAskQuote", "id": 2 },
                                                        "optionGreeks": { "type": "OptionGreeks", "id": 3 }
                                                    }
                                                },
                                                "BidAskQuote": {
                                                    "fields": {
                                                        "bidPrice": { "type": "double", "id": 1 },
                                                        "askPrice": { "type": "double", "id": 2 },
                                                        "bidQty": { "type": "int32", "id": 3 },
                                                        "askQty": { "type": "int32", "id": 4 }
                                                    }
                                                },
                                                "OptionGreeks": {
                                                    "fields": {
                                                        "op": { "type": "double", "id": 1 },
                                                        "up": { "type": "double", "id": 2 },
                                                        "iv": { "type": "double", "id": 3 },
                                                        "delta": { "type": "double", "id": 4 },
                                                        "theta": { "type": "double", "id": 5 },
                                                        "gamma": { "type": "double", "id": 6 },
                                                        "vega": { "type": "double", "id": 7 },
                                                        "rho": { "type": "double", "id": 8 }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
