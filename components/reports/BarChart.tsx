import React from 'react';

interface ChartData {
    name: string;
    hours: number;
}

interface BarChartProps {
    data: ChartData[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.hours), 0);
    const chartHeight = 250;
    const barWidth = 30;
    const barMargin = 15;
    const svgWidth = data.length * (barWidth + barMargin);

    return (
        <div className="overflow-x-auto p-4">
            <svg width={svgWidth} height={chartHeight} className="text-xs">
                {data.map((item, index) => {
                    const barHeight = maxValue > 0 ? (item.hours / maxValue) * (chartHeight - 40) : 0;
                    const x = index * (barWidth + barMargin);
                    const y = chartHeight - barHeight - 20;

                    return (
                        <g key={item.name}>
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                className="fill-current text-primary hover:text-primary-dark transition-colors"
                            />
                            <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" className="font-semibold fill-current text-gray-700">
                                {item.hours.toFixed(1)}h
                            </text>
                            <text x={x + barWidth / 2} y={chartHeight - 5} textAnchor="middle" className="fill-current text-gray-500">
                                {item.name}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default BarChart;
