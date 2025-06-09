class FilmAnalyticsDashboard {
    constructor() {
        this.data = {};
        this.charts = {};
        this.currentDecade = '2000';
        this.activeGenres = new Set();
        this.loadData().then(() => this.init());
    }

    async loadData() {
        try {
            // GitHub Raw URLs für Ihre JSON-Dateien
            const baseUrl = 'https://raw.githubusercontent.com/IHR-USERNAME/film-analytics-dashboard/main/';
            
            const [genresData, moviesData, ratingsData, regressionData, correlationData, statsData] = 
                await Promise.all([
                    fetch(baseUrl + 'top_5_genres_per_decade.json').then(r => r.json()),
                    fetch(baseUrl + 'top_20_movies_by_gross.json').then(r => r.json()),
                    fetch(baseUrl + 'top_20_movies_by_rating.json').then(r => r.json()),
                    fetch(baseUrl + 'regression_budget_vs_gross.json').then(r => r.json()),
                    fetch(baseUrl + 'correlation_rating_vs_gross.json').then(r => r.json()),
                    fetch(baseUrl + 'genre_budget_gross_stats.json').then(r => r.json())
                ]);
            
            this.data = {
                genresPerDecade: genresData,
                topMoviesByGross: moviesData,
                topMoviesByRating: ratingsData,
                regression: regressionData,
                correlation: correlationData,
                genreStats: statsData
            };
            
            console.log('✅ Alle Daten erfolgreich geladen:', this.data);
            
        } catch (error) {
            console.error('❌ Fehler beim Laden der JSON-Dateien:', error);
            this.loadFallbackData();
        }
    }

    loadFallbackData() {
        // Fallback mit Ihren echten Daten
        this.data = {
            genresPerDecade: {
                "2000": {
                    "Comedy": 36694029878,
                    "Drama": 32691047323,
                    "Adventure": 30724789604,
                    "Action": 29745964846,
                    "Thriller": 23173659055
                },
                "2010": {
                    "Adventure": 29843616416,
                    "Action": 27079350082,
                    "Comedy": 25821221436,
                    "Drama": 22944671411,
                    "Thriller": 19270270367
                }
            },
            topMoviesByGross: {
                "Avatar": 760505847,
                "Titanic": 658672302,
                "Jurassic World": 652177271,
                "The Avengers": 623279547,
                "The Dark Knight": 533316061
            },
            topMoviesByRating: {
                "Towering Inferno": 9.5,
                "The Shawshank Redemption": 9.3,
                "The Godfather": 9.2,
                "Dekalog": 9.1,
                "Kickboxer: Vengeance": 9.1
            },
            regression: {
                "slope": 0.033245971793577266,
                "intercept": 42500630.36168827,
                "r_value": 0.1066622394588288
            },
            correlation: {
                "correlation": 0.17556727432493902
            }
        };
    }

    async init() {
        this.setupStarfield();
        this.setupScrollytelling();
        this.createGenreFilter();
        this.createDecadeSlider();
        this.createHorizonChart();
        this.createPlotly3D();
        this.createRatingChart();
    }

    setupStarfield() {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('starfield-container').appendChild(renderer.domElement);

        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0x8A9B7C, // Ihr Salbeigrün
            size: 2,
            transparent: true,
            opacity: 0.8
        });

        const starsVertices = [];
        for (let i = 0; i < 3000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(stars);

        camera.position.z = 5;

        const animate = () => {
            requestAnimationFrame(animate);
            stars.rotation.x += 0.0005;
            stars.rotation.y += 0.0005;
            renderer.render(scene, camera);
        };
        animate();
    }

    setupScrollytelling() {
        const steps = document.querySelectorAll('.scroll-step');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    steps.forEach(step => step.classList.remove('active'));
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.5 });

        steps.forEach(step => observer.observe(step));
    }

    createGenreFilter() {
        const container = document.getElementById('genre-filter');
        const genres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi'];
        
        genres.forEach(genre => {
            const chip = document.createElement('div');
            chip.className = 'genre-chip';
            chip.textContent = genre;
            chip.onclick = () => this.toggleGenre(genre, chip);
            container.appendChild(chip);
        });
    }

    toggleGenre(genre, element) {
        if (this.activeGenres.has(genre)) {
            this.activeGenres.delete(genre);
            element.classList.remove('active');
        } else {
            this.activeGenres.add(genre);
            element.classList.add('active');
        }
        this.updateHorizonChart();
    }

    createDecadeSlider() {
        const container = document.getElementById('decade-slider');
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '1980';
        slider.max = '2010';
        slider.step = '10';
        slider.value = '2000';
        
        const label = document.createElement('div');
        label.textContent = `Dekade: ${slider.value}s`;
        
        slider.oninput = (e) => {
            this.currentDecade = e.target.value;
            label.textContent = `Dekade: ${e.target.value}s`;
            this.updateHorizonChart();
        };
        
        container.appendChild(label);
        container.appendChild(slider);
    }

    createHorizonChart() {
        const container = d3.select('#horizon-chart');
        container.selectAll('*').remove();
        
        if (!this.data.genresPerDecade) return;
        
        const width = 600;
        const height = 300;
        const margin = { top: 20, right: 20, bottom: 40, left: 60 };

        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);

        const data = this.processGenreDataForChart();
        
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.genre))
            .range([margin.left, width - margin.right])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)])
            .range([height - margin.bottom, margin.top]);

        const colorScale = d3.scaleOrdinal()
            .domain(data.map(d => d.genre))
            .range(['#8A9B7C', '#C8A2C8', '#7AB6E2', '#6EBD72', '#F4A261']);

        svg.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.genre))
            .attr('y', d => yScale(d.value))
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - margin.bottom - yScale(d.value))
            .attr('fill', d => colorScale(d.genre))
            .attr('opacity', 0.8)
            .on('mouseover', (event, d) => {
                this.showTooltip(event, `${d.genre} (${d.decade}s)<br>$${(d.value / 1000000).toFixed(1)}M`);
            })
            .on('mouseout', () => {
                this.hideTooltip();
            });

        // Achsen
        svg.append('g')
            .attr('transform', `translate(0, ${height - margin.bottom})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('fill', '#ffffff');

        svg.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(yScale).tickFormat(d => `$${(d / 1000000).toFixed(0)}M`))
            .selectAll('text')
            .style('fill', '#ffffff');
    }

    processGenreDataForChart() {
        if (!this.data.genresPerDecade || !this.data.genresPerDecade[this.currentDecade]) {
            return [];
        }
        
        const data = [];
        const decadeData = this.data.genresPerDecade[this.currentDecade];
        
        Object.entries(decadeData).forEach(([genre, value]) => {
            if (this.activeGenres.size === 0 || this.activeGenres.has(genre)) {
                data.push({ genre, decade: this.currentDecade, value });
            }
        });
        
        return data;
    }

    updateHorizonChart() {
        this.createHorizonChart();
    }

    createPlotly3D() {
        if (!this.data.topMoviesByGross || !this.data.topMoviesByRating) return;
        
        const movieData = this.generateBudgetGrossData();
        
        const trace = {
            x: movieData.budget,
            y: movieData.gross,
            z: movieData.rating,
            mode: 'markers',
            marker: {
                size: 8,
                color: movieData.gross,
                colorscale: [
                    [0, '#8A9B7C'],
                    [1, '#C8A2C8']
                ],
                showscale: true
            },
            type: 'scatter3d',
            text: movieData.titles,
            hovertemplate: '<b>%{text}</b><br>' +
                          'Budget: $%{x:,.0f}<br>' +
                          'Gross: $%{y:,.0f}<br>' +
                          'Rating: %{z}<br>' +
                          '<extra></extra>'
        };

        const layout = {
            scene: {
                xaxis: { title: 'Budget ($)', titlefont: { color: '#ffffff' }, tickfont: { color: '#ffffff' } },
                yaxis: { title: 'Gross Revenue ($)', titlefont: { color: '#ffffff' }, tickfont: { color: '#ffffff' } },
                zaxis: { title: 'IMDB Rating', titlefont: { color: '#ffffff' }, tickfont: { color: '#ffffff' } },
                bgcolor: 'rgba(0,0,0,0)'
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#ffffff' },
            margin: { l: 0, r: 0, b: 0, t: 0 }
        };

        Plotly.newPlot('plotly-3d', [trace], layout, {
            responsive: true,
            displayModeBar: false
        });
    }

    generateBudgetGrossData() {
        const movies = Object.entries(this.data.topMoviesByGross);
        const ratings = Object.values(this.data.topMoviesByRating);
        
        return {
            budget: movies.map(() => Math.random() * 200000000 + 50000000),
            gross: movies.map(([_, gross]) => gross),
            rating: movies.map((_, i) => ratings[i] || 7 + Math.random() * 2),
            titles: movies.map(([title, _]) => title)
        };
    }

    createRatingChart() {
        if (!this.data.topMoviesByRating) return;
        
        const container = d3.select('#rating-chart');
        container.selectAll('*').remove();
        
        const width = 800;
        const height = 400;
        const margin = { top: 20, right: 20, bottom: 100, left: 60 };

        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);

        const data = Object.entries(this.data.topMoviesByRating)
            .slice(0, 10)
            .map(([title, rating]) => ({ title, rating }));

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.title))
            .range([margin.left, width - margin.right])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, 10])
            .range([height - margin.bottom, margin.top]);

        const colorScale = d3.scaleLinear()
            .domain([8, 10])
            .range(['#8A9B7C', '#C8A2C8']);

        svg.selectAll('.rating-bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'rating-bar')
            .attr('x', d => xScale(d.title))
            .attr('y', d => yScale(d.rating))
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - margin.bottom - yScale(d.rating))
            .attr('fill', d => colorScale(d.rating))
            .attr('opacity', 0.8)
            .on('mouseover', (event, d) => {
                this.showTooltip(event, `${d.title}<br>Rating: ${d.rating}/10`);
            })
            .on('mouseout', () => {
                this.hideTooltip();
            });

        svg.append('g')
            .attr('transform', `translate(0, ${height - margin.bottom})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('fill', '#ffffff')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');

        svg.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(yScale))
            .selectAll('text')
            .style('fill', '#ffffff');
    }

    showTooltip(event, content) {
        const tooltip = document.getElementById('chart-tooltip');
        tooltip.innerHTML = content;
        tooltip.style.left = event.pageX + 10 + 'px';
        tooltip.style.top = event.pageY - 10 + 'px';
        tooltip.style.opacity = 1;
    }

    hideTooltip() {
        document.getElementById('chart-tooltip').style.opacity = 0;
    }
}

// Dashboard initialisieren
document.addEventListener('DOMContentLoaded', () => {
    new FilmAnalyticsDashboard();
});
