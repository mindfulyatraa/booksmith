import React, { useState } from 'react';
import { MarketData } from '../types';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, ComposedChart, Line 
} from 'recharts';
import { TrendingUp, DollarSign, Users, Search, Target, ArrowRight, BarChart3 } from 'lucide-react';

interface MarketAnalysisProps {
  data: MarketData | null;
  onAnalyzeTopic: (topic: string) => void;
}

const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const actualData = payload.find((p: any) => p.dataKey === 'actual');
    const forecastData = payload.find((p: any) => p.dataKey === 'forecast');
    
    const value = actualData ? actualData.value : forecastData?.value;
    const isForecast = !actualData && forecastData;
    const isBridge = actualData && forecastData;

    return (
      <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-sm">
        <p className="text-slate-300 text-xs mb-1 font-medium">{label}</p>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isForecast ? 'bg-rose-500' : 'bg-brand-500'}`} />
          <p className="font-bold text-white text-lg">
            {value}
          </p>
        </div>
        <p className={`text-xs mt-1 ${isForecast ? 'text-rose-400' : 'text-brand-400'}`}>
          {isBridge ? 'Current Status' : (isForecast ? 'AI Forecast' : 'Historical Data')}
        </p>
      </div>
    );
  }
  return null;
};

export const MarketAnalysis: React.FC<MarketAnalysisProps> = ({ data, onAnalyzeTopic }) => {
  const [topicInput, setTopicInput] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (topicInput.trim()) {
      onAnalyzeTopic(topicInput);
      setTopicInput("");
    }
  };

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-900 text-center">
        <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 max-w-lg w-full">
          <div className="w-16 h-16 bg-brand-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Market Intelligence</h2>
          <p className="text-slate-400 mb-8">
            Enter a book topic or keyword to analyze market potential, competition, and revenue forecasts using real-time AI data.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="E.g. Urban Fantasy, Python Programming..." 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white px-4 rounded-xl transition-colors font-medium">
              Analyze
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Prepare data with a bridge point to connect the charts visually
  const combinedChartData = [
    ...data.trendData.map((d, i) => ({ 
      ...d, 
      actual: d.value, 
      forecast: i === data.trendData.length - 1 ? d.value : null 
    })),
    ...data.forecastData.map(d => ({ 
      ...d, 
      actual: null, 
      forecast: d.value 
    }))
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 bg-slate-900">
      
      {/* Quick Search Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
        <div>
           <h2 className="text-xl font-bold text-white">Market Analysis: <span className="text-brand-400">{data.topic}</span></h2>
           <p className="text-xs text-slate-400">Deep dive market intelligence and AI forecasting.</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="Research another topic..." 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white p-2 rounded-lg transition-colors">
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-slate-400 text-sm">Est. Monthly Earnings</span>
            </div>
            <div className="text-2xl font-bold text-white">${data.potentialEarnings.toLocaleString()}</div>
          </div>
          
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Users className="w-5 h-5 text-orange-400" />
              </div>
              <span className="text-slate-400 text-sm">Competition Score</span>
            </div>
            <div className="text-2xl font-bold text-white">{data.difficultyScore}/100</div>
          </div>

          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-slate-400 text-sm">Trend Outlook</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {data.forecastData[data.forecastData.length - 1]?.value > data.trendData[data.trendData.length - 1]?.value ? 'Positive' : 'Stable'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Trend & Forecast Chart */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Trend & Forecast</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-500 rounded-full opacity-50"></div>
                <span className="text-slate-400">Historical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 border-t-2 border-dashed border-rose-500"></div>
                <span className="text-slate-400">Forecast</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combinedChartData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="actual" 
                name="Historical" 
                stroke="#0ea5e9" 
                fillOpacity={1} 
                fill="url(#colorActual)" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="forecast" 
                name="Forecast" 
                stroke="#f43f5e" 
                strokeDasharray="5 5" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Competitor Market Share */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 h-[400px]">
          <h3 className="text-lg font-semibold text-white mb-4">Competitor Market Share</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.competitorInsights.map(c => ({ name: c.name, value: c.marketShare }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {data.competitorInsights.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keywords */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-brand-400" /> Top Keywords
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-800 text-slate-200 uppercase font-medium">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Keyword</th>
                  <th className="px-4 py-3">Volume</th>
                  <th className="px-4 py-3 rounded-r-lg">Competition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.topKeywords.map((kw, i) => (
                  <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{kw.term}</td>
                    <td className="px-4 py-3">{kw.volume}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        kw.competition === 'High' ? 'bg-red-500/20 text-red-400' :
                        kw.competition === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {kw.competition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Competitor Insights */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-400" /> Competitor Analysis
          </h3>
          <div className="space-y-4">
            {data.competitorInsights.map((comp, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-white">{comp.name}</h4>
                  <span className="text-xs text-slate-500">{comp.marketShare}% Share</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-green-400">
                    <span className="block font-bold mb-1 opacity-70 uppercase tracking-wider">Strength</span>
                    {comp.strength}
                  </div>
                  <div className="text-red-400">
                    <span className="block font-bold mb-1 opacity-70 uppercase tracking-wider">Weakness</span>
                    {comp.weakness}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};