import { BigQuery } from '@google-cloud/bigquery';
import express, { Request, Response, query } from 'express';
import cors from 'cors';

interface Params {
    id: string;
}

const app = express();
const PORT = process.env.PORT || 8080;
const bigquery = new BigQuery();

app.use(cors());

async function getUserFavoriteDay(id: string) {
    const query = `SELECT
    EXTRACT(DAYOFWEEK FROM b.date) AS dayofweek,
    CASE EXTRACT(DAYOFWEEK FROM b.date)
        WHEN 1 THEN 'Sunday'
        WHEN 2 THEN 'Monday'
        WHEN 3 THEN 'Tuesday'
        WHEN 4 THEN 'Wednesday'
        WHEN 5 THEN 'Thursday'
        WHEN 6 THEN 'Friday'
        WHEN 7 THEN 'Saturday'
    END AS dayofweekdesc,
    COUNT(*) AS count
FROM 
    f3omaha.firestore_beatdown_attendance.beatdown_attendance_schema_beatdown_community_attendance_schema_latest a
JOIN 
    f3omaha.firestore_beatdowns.beatdowns_schema_beatdown_schema_latest b ON a.beatdown = CONCAT('beatdowns/', b.document_id)
JOIN 
    f3omaha.firestore_users.users_raw_latest u ON a.usersAttended_member = CONCAT('users/', u.document_id)
WHERE 
    a.usersAttended_member = "users/${id}"
GROUP BY 
    EXTRACT(DAYOFWEEK FROM b.date),
    CASE EXTRACT(DAYOFWEEK FROM b.date)
        WHEN 1 THEN 'Sunday'
        WHEN 2 THEN 'Monday'
        WHEN 3 THEN 'Tuesday'
        WHEN 4 THEN 'Wednesday'
        WHEN 5 THEN 'Thursday'
        WHEN 6 THEN 'Friday'
        WHEN 7 THEN 'Saturday'
    END
ORDER BY 
    count DESC`;

    const [rows] = await bigquery.query(query);
    const transformed = rows.map(r => {
        return {
            dayOfWeek: r.dayofweekdesc,
            posts: r.count
        }
    });

    return transformed;
}

async function getUserTopSites(id: string) {
    const query = `select bd.aoName, count(*) as total
        from f3omaha.firestore_beatdown_attendance.beatdown_attendance_schema_beatdown_community_attendance_schema_latest a
        inner join f3omaha.firestore_users.users_raw_latest u on a.usersAttended_member = concat("users/", u.document_id)
        inner join f3omaha.firestore_beatdowns.beatdowns_schema_beatdown_schema_latest bd on a.beatdown = concat("beatdowns/", bd.document_id)
        where u.document_id = "${id}"
        GROUP BY bd.aoName
        ORDER BY COUNT(*) DESC
        LIMIT 5;`;

    const [rows] = await bigquery.query(query);
    const transformed = rows.map(r => {
        return {
            aoName: r.aoName,
            posts: r.total
        }
    });

    return transformed;
}

async function getUserMostPostedWith(id: string) {
    const query = `select
        b.usersAttended_member,
        REGEXP_EXTRACT(u.data, r'f3Name":"(.*?)","') AS F3Name,
        COUNT(*) as count
        from f3omaha.firestore_beatdown_attendance.beatdown_attendance_schema_beatdown_community_attendance_schema_latest a
        join f3omaha.firestore_beatdown_attendance.beatdown_attendance_schema_beatdown_community_attendance_schema_latest b on a.document_id = b.document_id
        join f3omaha.firestore_users.users_raw_latest u on b.usersAttended_member = concat("users/", u.document_id)
        where a.usersAttended_member = "users/${id}"
        and a.usersAttended_member <> b.usersAttended_member
        group by b.usersAttended_member, u.data
        order by count(*) desc
        limit 5;`;

    const [rows] = await bigquery.query(query);
    const transformed = rows.map(r => {
        return {
            userDocRef: r.usersAttended_member,
            f3Name: r.F3Name,
            posts: r.count
        }
    });

    return transformed;
}

async function getTotalPostsForUser(id: string) {
    const query = `SELECT
        REGEXP_EXTRACT(u.data, r'f3Name":"(.*?)","') AS F3Name,
        COUNT(*) AS total_posts
    FROM f3omaha.firestore_beatdown_attendance.beatdown_attendance_schema_beatdown_community_attendance_schema_latest a
    JOIN f3omaha.firestore_users.users_raw_latest u on a.usersAttended_member = concat("users/", u.document_id)
    WHERE a.usersAttended_member = "users/${id}"
    GROUP BY u.data
    LIMIT 1;`;
    
    const [rows] = await bigquery.query(query);
    const transformed = rows.map(r => {
        return {
            f3Name: r.F3Name,
            posts: r.total_posts
        }
    });

    return transformed[0];
}

// Users
app.get('/users/most-posted-with/:id', async (req: Request<Params>, res: Response) => {
    
    const { id } = req.params;

    try {
        const rows = await getUserMostPostedWith(id);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying BigQuery');
    }
});

app.get('/users/stats/:id', async (req: Request<Params>, res: Response) => {
    const { id } = req.params;

    try {
        const [totalPosts, mostPostedWith, topSites, favoriteDay] = await Promise.all([
            getTotalPostsForUser(id),
            getUserMostPostedWith(id),
            getUserTopSites(id),
            getUserFavoriteDay(id),
        ]);

        const response = {
            totalPosts,
            mostPostedWith,
            topSites,
            favoriteDay,
        };

        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying BigQuery');
    }
});

app.get('/users/top-sites/:id', async (req: Request<Params>, res: Response) => {
    
    const { id } = req.params;

    try {
        const rows = await getUserTopSites(id);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying BigQuery');
    }
});

app.get('/users/favorite-day/:id', async (req: Request<Params>, res: Response) => {
    
    const { id } = req.params;

    try {
        const rows = await getUserFavoriteDay(id);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying BigQuery');
    }
});

app.get('/users/top-10-leaderboard', async (req: Request, res: Response) => {
    
    try {
        const query = `SELECT
  REGEXP_EXTRACT(u.data, r'f3Name":"(.*?)","') AS F3Name,
  COUNT(*) AS total_posts
FROM f3omaha.firestore_beatdown_attendance.beatdown_attendance_schema_beatdown_community_attendance_schema_latest a
JOIN f3omaha.firestore_users.users_raw_latest u on a.usersAttended_member = concat("users/", u.document_id)
GROUP BY u.data
ORDER BY total_posts DESC
LIMIT 10;
`;
        const [rows] = await bigquery.query(query);
        const transformed = rows.map(r => {
            return {
                f3Name: r.F3Name,
                posts: r.total_posts
            }
        });
        res.json(transformed);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying BigQuery');
    }
});

app.get('/users/top-10-leaderboard/:timeframe', async (req: Request, res: Response) => {
    
    const { timeframe } = req.params;

    try {
        const weekQuery = `SELECT
  REGEXP_EXTRACT(u.data, r'f3Name":"(.*?)","') AS F3Name,
  COUNT(*) AS total_posts
FROM f3omaha.firestore_beatdown_attendance.beatdown_attendance_schema_beatdown_community_attendance_schema_latest a
JOIN f3omaha.firestore_users.users_raw_latest u on a.usersAttended_member = concat("users/", u.document_id)
WHERE EXTRACT(YEAR FROM CURRENT_DATE()) = EXTRACT(YEAR FROM a.timestamp)
AND EXTRACT(WEEK FROM CURRENT_DATE()) = EXTRACT(WEEK FROM a.timestamp)
GROUP BY REGEXP_EXTRACT(u.data, r'f3Name":"(.*?)","')
ORDER BY COUNT(*) DESC
`;

        const monthQuery = `
SELECT
  REGEXP_EXTRACT(u.data, r'f3Name":"(.*?)","') AS F3Name,
  COUNT(*) AS total_posts
FROM f3omaha.firestore_beatdown_attendance.beatdown_attendance_schema_beatdown_community_attendance_schema_latest a
JOIN f3omaha.firestore_users.users_raw_latest u on a.usersAttended_member = concat("users/", u.document_id)
WHERE EXTRACT(YEAR FROM CURRENT_DATE()) = EXTRACT(YEAR FROM a.timestamp)
AND EXTRACT(MONTH FROM CURRENT_DATE()) = EXTRACT(MONTH FROM a.timestamp)
GROUP BY REGEXP_EXTRACT(u.data, r'f3Name":"(.*?)","')
ORDER BY COUNT(*) DESC
`;

        const yearQuery = `
SELECT
  REGEXP_EXTRACT(u.data, r'f3Name":"(.*?)","') AS F3Name,
  COUNT(*) AS total_posts
FROM f3omaha.firestore_beatdown_attendance.beatdown_attendance_schema_beatdown_community_attendance_schema_latest a
JOIN f3omaha.firestore_users.users_raw_latest u on a.usersAttended_member = concat("users/", u.document_id)
WHERE EXTRACT(YEAR FROM CURRENT_DATE()) = EXTRACT(YEAR FROM a.timestamp)
GROUP BY REGEXP_EXTRACT(u.data, r'f3Name":"(.*?)","')
ORDER BY COUNT(*) DESC
`;

        const query = timeframe === 'week' ? weekQuery : timeframe === 'month' ? monthQuery : yearQuery;

        const [rows] = await bigquery.query(query);
        const transformed = rows.map(r => {
            return {
                f3Name: r.F3Name,
                posts: r.total_posts
            }
        });
        res.json(transformed);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying BigQuery');
    }
});

// AOs
app.get('/aos/top-site-attendance-total', async (req: Request, res: Response) => {
    try {
        const query = `SELECT b.aoName, SUM(totalPaxCount)
FROM f3omaha.firestore_beatdown_attendance.beatdown_attendance_schema_beatdown_community_attendance_schema_latest a
JOIN f3omaha.firestore_beatdowns.beatdowns_schema_beatdown_schema_latest b ON a.beatdown = CONCAT('beatdowns/', b.document_id)
WHERE a.usersAttended_index = 0
GROUP BY b.aoName
ORDER BY SUM(totalPaxCount) DESC
LIMIT 5`;
    
        const [rows] = await bigquery.query(query);
        const transformed = rows.map(r => {
            return {
                aoName: r.aoName,
                posts: Number(r.f0_)
            }
        });
        res.json(transformed);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying BigQuery');
    }
});

app.get('/aos/top-fngs-total', async (req: Request, res: Response) => {
    try {
        const query = `SELECT
  EXTRACT(MONTH FROM b.date) AS month,
  SUM(a.fngcount) as FNGCount
FROM 
  f3omaha.firestore_beatdown_attendance.beatdown_attendance_schema_beatdown_community_attendance_schema_latest a
JOIN 
  f3omaha.firestore_beatdowns.beatdowns_schema_beatdown_schema_latest b ON a.beatdown = CONCAT('beatdowns/', b.document_id)
WHERE
  a.usersAttended_index = 0
GROUP BY
  EXTRACT(MONTH FROM b.date)
ORDER BY
  SUM(a.fngcount) DESC`;
    
        const [rows] = await bigquery.query(query);
        const transformed = rows.map(r => {
            return {
                monthNumber: r.month,
                count: r.FNGCount
            }
        });
        res.json(transformed);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying BigQuery');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});