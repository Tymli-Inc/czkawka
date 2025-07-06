import { IoPieChart } from "react-icons/io5";
import styles from "./category-graph.module.css";
import {  useEffect, useState } from "react";

export default function CategoryGraph({
    selectedDate,
}: {
    selectedDate?: number;
}) {

    const [data, setData] = useState<{
        category: string;
        time: number;
        color: string;
    }[]>([]);


    useEffect(() => {
        async function fetchData() {
            try {
                const response = await window.electronAPI.getDailyCategoryBreakdown(selectedDate);
                if (response.success) {
                    setData(response.data);
                    console.log("Category data fetched successfully:", response.data);
                } else {
                    console.error("Failed to fetch category data:", response.error);
                }
            } catch (error) {
                console.error("Error fetching category data:", error);
            }
        }

        fetchData();
    }, [selectedDate]);
    const formatTime = (ms: number) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const totalTime = data.reduce((sum, item) => sum + item.time, 0);

    const generatePieSegments = () => {
        let cumulativePercentage = 0;
        
        return data.map((item, index) => {
            const percentage = totalTime > 0 ? (item.time / totalTime) * 100 : 0;
            const startAngle = (cumulativePercentage / 100) * 360;
            const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
            
            cumulativePercentage += percentage;
            
            return {
                ...item,
                percentage,
                startAngle,
                endAngle,
                index
            };
        });
    };

    const pieSegments = generatePieSegments();

    return (
        <div className={styles.categoryGraph}>
            <div style={{
                width: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.66)',
                position: 'sticky',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '10px 20px',
                zIndex: 20,
                backdropFilter: 'blur(10px)',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
            }}>
                <span style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    fontSize: '14px',
                    lineHeight: '1.8',
                    fontWeight: '300',
                    color: 'rgba(158, 158, 158, 0.9)',
                }}>
                    <IoPieChart />
                    <span style={{
                        fontSize: '10px',
                        fontWeight: '300',
                        color: 'rgba(158, 158, 158, 0.9)',
                    }}>
                        Category Breakdown
                    </span>
                </span>
            </div>


            {data.length === 0 ? (
                <p>No data available for the selected date.</p>
            ) : (
                <div className={styles.graphContainer}>
                    <div className={styles.pieChartContainer}>
                        <div className={styles.pieChart}>
                            <svg width="200" height="200" viewBox="0 0 200 200">
                                {pieSegments.map((segment, index) => {
                                    const centerX = 100;
                                    const centerY = 100;
                                    const radius = 80;
                                    
                                    const startAngleRad = (segment.startAngle * Math.PI) / 180;
                                    const endAngleRad = (segment.endAngle * Math.PI) / 180;
                                    
                                    const x1 = centerX + radius * Math.cos(startAngleRad);
                                    const y1 = centerY + radius * Math.sin(startAngleRad);
                                    const x2 = centerX + radius * Math.cos(endAngleRad);
                                    const y2 = centerY + radius * Math.sin(endAngleRad);
                                    
                                    const largeArcFlag = segment.endAngle - segment.startAngle > 180 ? 1 : 0;
                                    
                                    const pathData = [
                                        `M ${centerX} ${centerY}`,
                                        `L ${x1} ${y1}`,
                                        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                        'Z'
                                    ].join(' ');
                                    
                                    return (
                                        <path
                                            key={index}
                                            d={pathData}
                                            fill={segment.color}
                                            stroke="rgba(255, 255, 255, 0.1)"
                                            strokeWidth="1"
                                            className={styles.pieSegment}
                                        />
                                    );
                                })}
                            </svg>
                            
                            <div className={styles.centerCircle}>
                                <div className={styles.totalTime}>{formatTime(totalTime)}</div>
                                <div className={styles.totalLabel}>Total</div>
                            </div>
                        </div>
                        
                        <div className={styles.legend}>
                            {pieSegments.map((segment, index) => (
                                <div key={index} className={styles.legendItem}>
                                    <div 
                                        className={styles.legendColor}
                                        style={{ backgroundColor: segment.color }}
                                    />
                                    <div className={styles.legendInfo}>
                                        <span className={styles.legendCategory}>{segment.category}</span>
                                        <span className={styles.legendTime}>
                                            ({segment.percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.summary}>
                        <p>{data.length} categories tracked</p>
                    </div>
                </div>
            )}
        </div>
    );
}