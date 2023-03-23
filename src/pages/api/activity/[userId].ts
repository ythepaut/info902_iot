import {
    BadRequestException,
    Body,
    createHandler,
    Get,
    HttpCode,
    ParseDatePipe,
    ParseNumberPipe,
    Post,
    Query,
    ValidationPipe,
} from "next-api-decorators";
import {
    ACTIVITY_COLLECTION_NAME,
    CreateActivityDTO,
} from "../../../types/dto/activity";
import clientPromise from "../../../services/server/mongodb";

class ActivityHandler {
    @Get()
    @HttpCode(200)
    getActivity(
        @Query("dateForm", ParseDatePipe({ nullable: true }))
        queryDateFrom?: Date,
        @Query("dateTo", ParseDatePipe({ nullable: true })) queryDateTo?: Date,
        @Query("limit", ParseNumberPipe({ nullable: true }))
        queryLimit?: number,
        @Query("page", ParseNumberPipe({ nullable: true })) queryPage?: number,
    ) {
        const dateFrom = queryDateFrom ?? new Date(0);
        const dateTo = queryDateTo ?? new Date(8640000000000000); // latest possible date ((2^63-1) / 2)
        const limit = queryLimit ?? 100;
        const page = queryPage ?? 1;

        if (limit < 1) throw new BadRequestException("Limit must be >= 1");
        if (page < 1) throw new BadRequestException("Page must be >= 1");

        return new Promise(async (resolve) => {
            let db = (await clientPromise).db("INFO902");
            let results = await db
                .collection(ACTIVITY_COLLECTION_NAME)
                .find({
                    dateFrom: { $gte: dateFrom, $lte: dateTo },
                })
                .skip((page - 1) * limit)
                .limit(limit)
                .map((activity) => ({ ...activity, _id: undefined }))
                .toArray();
            resolve(results);
        });
    }

    @Post()
    @HttpCode(201)
    createActivity(@Body(ValidationPipe) body: CreateActivityDTO) {
        return new Promise(async (resolve) => {
            let db = (await clientPromise).db("INFO902");
            await db.collection(ACTIVITY_COLLECTION_NAME).insertOne(body);
            resolve(null);
        });
    }
}

export default createHandler(ActivityHandler);
